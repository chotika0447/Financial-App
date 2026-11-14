import base64
import hashlib
import hmac
import json
import logging

from datetime import datetime
from decimal import Decimal, InvalidOperation
from uuid import uuid4
from io import BytesIO
from urllib.parse import parse_qs, urlencode
from collections import defaultdict

import httpx

from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Sum

from .parser import parse_financial_message
from categories.category_matching import accessible_category, fallback_category, match_category

from .supabase_storage import (
    upload_receipt,
    delete_receipt,
)

from categories.models import Category

from transactions.models import Transaction
from users.models import User
from friends.models import Friends
from savings.models import Savings, SavingsTransaction

from .messaging import approve_payment_from_line

import re

from django.core.files.uploadedfile import SimpleUploadedFile

from debts.models import Debts, Payments
from debts.views import (
    calculate_payment_due_date,
    get_next_monthly_due_date,
    get_related_debts,
    recalculate_debt_remaining,
    send_payment_created_notification,
    upload_debt_image,
)

logger = logging.getLogger(__name__)

# ==================== Pending Transaction ====================

PENDING_TIMEOUT_SECONDS = 30 * 60
RECORD_MODE_TIMEOUT_SECONDS = 30 * 24 * 60 * 60

def pending_key(line_user_id):
    return f"line_pending_transaction:{line_user_id}"


def get_pending(line_user_id, user):
    data = cache.get(pending_key(line_user_id))

    if not data:
        return None

    if data.get("user_id") != user.uid:
        return None

    return data


def set_pending(line_user_id, data):
    cache.set(
        pending_key(line_user_id),
        data,
        timeout=PENDING_TIMEOUT_SECONDS
    )


def clear_pending(line_user_id):
    cache.delete(pending_key(line_user_id))


def record_mode_key(line_user_id):
    return f"line_record_mode:{line_user_id}"


def set_record_mode(line_user_id, transaction_type):
    cache.set(
        record_mode_key(line_user_id),
        transaction_type,
        timeout=RECORD_MODE_TIMEOUT_SECONDS
    )


def get_record_mode(line_user_id):
    return cache.get(record_mode_key(line_user_id))
# =======================================================
def transaction_flow_key(line_user_id):
    return f"line_transaction_flow:{line_user_id}"


def get_transaction_flow(line_user_id):
    return cache.get(transaction_flow_key(line_user_id))


def set_transaction_flow(line_user_id, state):
    cache.set(
        transaction_flow_key(line_user_id),
        state,
        timeout=PENDING_TIMEOUT_SECONDS
    )


def clear_transaction_flow(line_user_id):
    cache.delete(transaction_flow_key(line_user_id))

# ==================== LINE Debt Payment Flow ====================

def debt_flow_key(line_user_id):
    return f"line_debt_payment:{line_user_id}"


def get_debt_flow(line_user_id):
    return cache.get(debt_flow_key(line_user_id))


def set_debt_flow(line_user_id, state):
    cache.set(
        debt_flow_key(line_user_id),
        state,
        timeout=PENDING_TIMEOUT_SECONDS,
    )


def clear_debt_flow(line_user_id):
    cache.delete(debt_flow_key(line_user_id))

def build_line_debt_list_flex(user):
    debts = Debts.objects.filter(
        user=user,
        type="borrowed",
        status="ongoing",
        remaining_amount__gt=0,
    ).order_by("due_date", "-created_at")

    if not debts.exists():
        return {
            "type": "text",
            "text": "ตอนนี้ไม่มีรายการหนี้สินที่ต้องชำระค่ะ 😊",
        }

    bubbles = []

    for debt in debts[:10]:
        due_date = (
            debt.due_date.strftime("%d/%m/%Y")
            if debt.due_date else "-"
        )

        counterparty = (
            debt.counterparty_name or "-"
        )

        bubbles.append({
            "type": "bubble",
            "size": "kilo",
            "body": {
                "type": "box",
                "layout": "vertical",
                "spacing": "md",
                "contents": [
                    {
                        "type": "text",
                        "text": debt.name[:100],
                        "weight": "bold",
                        "size": "lg",
                        "wrap": True,
                        "color": "#30294A",
                    },
                    {
                        "type": "separator",
                        "color": "#E8E5F0",
                    },
                    {
                        "type": "text",
                        "text": f"เจ้าหนี้: {counterparty}",
                        "size": "sm",
                        "wrap": True,
                        "color": "#777286",
                    },
                    {
                        "type": "text",
                        "text": (
                            f"ยอดหนี้คงเหลือ: "
                            f"{debt.remaining_amount:,.2f} บาท"
                        ),
                        "size": "lg",
                        "weight": "bold",
                        "color": "#6C4BC1",
                        "wrap": True,
                    },
                    {
                        "type": "text",
                        "text": f"ครบกำหนด: {due_date}",
                        "size": "sm",
                        "color": "#777286",
                    },
                ],
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "button",
                        "style": "primary",
                        "color": "#6C4BC1",
                        "action": {
                            "type": "postback",
                            "label": "ชำระหนี้รายการนี้",
                            "data": (
                                f"action=debt_select"
                                f"&debt_id={debt.pk}"
                            ),
                            "displayText": (
                                f"เลือกชำระหนี้ {debt.name}"
                            ),
                        },
                    },
                ],
            },
        })

    return {
        "type": "flex",
        "altText": "รายการหนี้สินที่ต้องชำระ",
        "contents": {
            "type": "carousel",
            "contents": bubbles,
        },
    }
def build_debt_attach_image_flex():
    return {
        "type": "flex",
        "altText": "ต้องการแนบรูปหลักฐานการชำระเงินไหม?",
        "contents": {
            "type": "bubble",
            "body": {
                "type": "box",
                "layout": "vertical",
                "spacing": "md",
                "contents": [
                    {
                        "type": "text",
                        "text": "รับจำนวนเงินแล้วค่ะ",
                        "weight": "bold",
                        "size": "lg",
                        "color": "#30294A",
                    },
                    {
                        "type": "text",
                        "text": (
                            "ต้องการแนบรูปหลักฐานการโอนเงินไหมคะ?"
                        ),
                        "size": "sm",
                        "wrap": True,
                        "color": "#777286",
                    },
                    {
                        "type": "text",
                        "text": (
                            "หากต้องการแนบรูป สามารถส่งรูปภาพ "
                            "เข้ามาในแชตได้เลยค่ะ"
                        ),
                        "size": "xs",
                        "wrap": True,
                        "color": "#777286",
                    },
                ],
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "button",
                        "style": "primary",
                        "color": "#6C4BC1",
                        "action": {
                            "type": "postback",
                            "label": "ไม่แนบรูป / ตรวจสอบรายการ",
                            "data": (
                                "action=debt_finish_without_image"
                            ),
                            "displayText": "ไม่แนบรูป ตรวจสอบรายการ",
                        },
                    },
                ],
            },
        },
    }

def build_line_debt_payment_success_flex(
    debt,
    paid_amount,
    approvement_status,
    history_url,
):
    status_text = (
        "รอเจ้าหนี้ตรวจสอบและอนุมัติ"
        if approvement_status == "pending"
        else "บันทึกการชำระสำเร็จ"
    )

    return {
        "type": "flex",
        "altText": "บันทึกการชำระหนี้เรียบร้อยแล้ว",
        "contents": {
            "type": "bubble",
            "body": {
                "type": "box",
                "layout": "vertical",
                "spacing": "md",
                "backgroundColor": "#FFF9EE",
                "contents": [
                    {
                        "type": "text",
                        "text": "ชำระหนี้เรียบร้อยแล้ว",
                        "weight": "bold",
                        "size": "xl",
                        "color": "#805035",
                        "wrap": True,
                    },
                    {
                        "type": "separator",
                        "color": "#E8DCC8",
                    },
                    {
                        "type": "text",
                        "text": f"รายการหนี้: {debt.name[:100]}",
                        "size": "sm",
                        "color": "#594A3D",
                        "wrap": True,
                    },
                    {
                        "type": "text",
                        "text": f"จำนวนเงิน: {paid_amount:,.2f} บาท",
                        "size": "lg",
                        "weight": "bold",
                        "color": "#805035",
                        "wrap": True,
                    },
                    {
                        "type": "text",
                        "text": f"สถานะ: {status_text}",
                        "size": "sm",
                        "color": "#8B7A68",
                        "wrap": True,
                    },
                ],
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "backgroundColor": "#FFF9EE",
                "contents": [
                    {
                        "type": "button",
                        "style": "primary",
                        "color": "#B8D95A",
                        "action": {
                            "type": "uri",
                            "label": "ตรวจสอบ",
                            "uri": history_url,
                        },
                    },
                ],
            },
        },
    }

# คำนวณยอดคงเหลือและการแจ้งเตือนจาก debts/views.py
def save_line_debt_payment(
    user,
    line_user_id,
    image_bytes=None,
    message_id=None,
):
    state = get_debt_flow(line_user_id)

    if not state or state.get("step") != "await_image":
        return "ไม่พบรายการที่กำลังรอชำระค่ะ กรุณาเริ่มใหม่อีกครั้ง"

    debt = Debts.objects.filter(
        pk=state.get("debt_id"),
        user=user,
        type="borrowed",
        status="ongoing",
    ).first()

    if debt is None:
        clear_debt_flow(line_user_id)
        return "ไม่พบรายการหนี้นี้ หรือรายการนี้ชำระครบแล้วค่ะ"

    paid_amount = Decimal(state.get("amount", "0"))

    if paid_amount <= 0:
        clear_debt_flow(line_user_id)
        return "จำนวนเงินไม่ถูกต้อง กรุณาเริ่มรายการใหม่ค่ะ"

    # อัปโหลดรูปหลักฐานไป Supabase
    proof_image_url = None

    if image_bytes:
        try:
            image_file = SimpleUploadedFile(
                name=f"line_debt_{message_id}.jpg",
                content=image_bytes,
                content_type="image/jpeg",
            )

            proof_image_url = upload_debt_image(image_file)

        except Exception as error:
            logger.exception(
                "LINE debt proof upload failed: %s",
                error,
            )
            return (
                "อัปโหลดรูปหลักฐานไม่สำเร็จค่ะ "
                "กรุณาส่งรูปอีกครั้ง"
            )

    try:
        with transaction.atomic():

            debt = Debts.objects.select_for_update().get(
                pk=debt.pk,
                user=user,
                type="borrowed",
            )

            # อัปเดตยอดหนี้ให้เป็นปัจจุบันก่อนตรวจสอบ
            recalculate_debt_remaining(debt)
            debt.refresh_from_db()

            related_debts = get_related_debts(debt)
            related_ids = [item.pk for item in related_debts]

            # รวมยอดที่ชำระแล้วและรายการที่รออนุมัติ
            paid_total = (
                Payments.objects.filter(
                    debt_id__in=related_ids,
                    approvement_status__in=[
                        "approved",
                        "pending",
                    ],
                ).aggregate(
                    total=Sum("paid_amount")
                )["total"]
                or Decimal("0.00")
            )

            shared_remaining = (
                Decimal(debt.total_amount) - Decimal(paid_total)
            )

            if shared_remaining <= 0:
                return "รายการนี้ชำระครบแล้วค่ะ"

            if paid_amount > shared_remaining:
                return (
                    f"จำนวนเงินเกินยอดหนี้คงเหลือค่ะ "
                    f"คุณสามารถชำระได้ไม่เกิน "
                    f"{shared_remaining:,.2f} บาท"
                )

            # คำนวณวันครบกำหนดจากระบบเดิม
            current_due_date = calculate_payment_due_date(debt)

            # หนี้ผูกบัญชีเพื่อนต้องรอเจ้าหนี้อนุมัติ
            approvement_status = (
                "pending"
                if debt.paired_debt_id
                else "approved"
            )

            scheduled_amount = (
                debt.payment_amount
                if debt.payment_type == "monthly"
                else None
            )

            # กำหนดสถานะการชำระให้เหมือนระบบเว็บไซต์
            if paid_amount <= 0:
                payment_status = "pending"
            elif (
                scheduled_amount is not None
                and paid_amount < scheduled_amount
            ):
                payment_status = "partial"
            else:
                payment_status = "paid"

            payment = Payments.objects.create(
                debt=debt,
                scheduled_amount=scheduled_amount,
                paid_amount=paid_amount,
                due_date=current_due_date,
                paid_date=timezone.localdate(),
                proof_image=proof_image_url,
                note="ชำระผ่าน LINE OA",
                payment_status=payment_status,
                approvement_status=approvement_status,
            )

            # คำนวณยอดหนี้คงเหลือใหม่
            recalculate_debt_remaining(debt)
            debt.refresh_from_db()

            # เลื่อนงวดถัดไปเฉพาะหนี้รายเดือนที่อนุมัติแล้ว
            if (
                debt.payment_type == "monthly"
                and debt.payment_amount is not None
                and approvement_status == "approved"
            ):
                installment_paid_total = (
                    Payments.objects.filter(
                        debt_id__in=related_ids,
                        due_date=current_due_date,
                        approvement_status="approved",
                    ).aggregate(
                        total=Sum("paid_amount")
                    )["total"]
                    or Decimal("0.00")
                )

                installment_target = min(
                    Decimal(debt.payment_amount),
                    shared_remaining,
                )

                if (
                    installment_target > 0
                    and installment_paid_total >= installment_target
                    and debt.remaining_amount > 0
                ):
                    next_due_date = get_next_monthly_due_date(
                        current_due_date,
                        debt.payment_date,
                    )

                    for related_debt in related_debts:
                        related_debt.current_due_date = next_due_date
                        related_debt.save(
                            update_fields=[
                                "current_due_date",
                                "updated_at",
                            ]
                        )

            # เรียกใช้ระบบแจ้งเตือนเดิมหลังบันทึกสำเร็จ
            transaction.on_commit(
                lambda payment_id=payment.pk,
                       previous_remaining=shared_remaining:
                    send_payment_created_notification(
                        payment_id,
                        previous_remaining,
                    )
            )

        clear_debt_flow(line_user_id)

        history_url = "https://financial-app-delta-taupe.vercel.app/debts/"

        return build_line_debt_payment_success_flex(
            debt=debt,
            paid_amount=paid_amount,
            approvement_status=approvement_status,
            history_url=history_url,
        )

    except Exception as error:
        logger.exception(
            "LINE debt payment creation failed: %s",
            error,
        )
        return (
            "เกิดข้อผิดพลาดในการบันทึกการชำระหนี้ค่ะ "
            "กรุณาลองใหม่อีกครั้ง"
        )

def build_attach_receipt_flex():
    return {
        "type": "flex",
        "altText": "ต้องการแนบรูปหลักฐานการโอนเงินไหม?",
        "contents": {
            "type": "bubble",
            "body": {
                "type": "box",
                "layout": "vertical",
                "backgroundColor": "#FFF9EE",
                "spacing": "md",
                "contents": [
                    {
                        "type": "text",
                        "text": "รับข้อมูลรายการแล้วค่ะ",
                        "weight": "bold",
                        "size": "lg",
                        "color": "#805035",
                        "wrap": True
                    },
                    {
                        "type": "text",
                        "text": "ต้องการแนบรูปภาพเพื่อเป็นหลักฐานเพิ่มเติมไหมคะ?",
                        "size": "sm",
                        "color": "#594A3D",
                        "wrap": True
                    },
                    {
                        "type": "text",
                        "text": (
                            "หากต้องการแนบรูป กรุณาส่งรูปภาพภายใน 30 นาที "
                            "นับจากเวลาที่ระบบรับข้อมูลรายการค่ะ\n"
                            "หากไม่ต้องการแนบรูป สามารถกดตรวจสอบรายการได้เลยค่ะ"
                        ),
                        "size": "xs",
                        "color": "#8B7A68",
                        "wrap": True
                    }
                ]
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "backgroundColor": "#FFF9EE",
                "contents": [
                    {
                        "type": "button",
                        "style": "primary",
                        "color": "#B8D95A",
                        "action": {
                            "type": "postback",
                            "label": "ไม่แนบรูป / ตรวจสอบรายการ",
                            "data": "action=transaction_finish_without_image",
                            "displayText": "ไม่แนบรูป / ตรวจสอบรายการ"
                        }
                    }
                ]
            }
        }
    }

def build_image_note_prompt():
    return (
        "ได้รับรูปภาพแล้วค่ะ 📷\n"
        "ต้องการบันทึกรายการนี้ว่าอะไรคะ?\n\n"
        "กรุณาพิมพ์ เช่น ข้าวมันไก่ 60"
    )

# ==================== LINE Reply ====================

def reply_to_line(reply_token, message):
    """ส่งข้อความธรรมดาหรือ Flex Message"""

    if not reply_token:
        return

    if isinstance(message, dict):
        line_message = message
    else:
        line_message = {
            "type": "text",
            "text": str(message)
        }

    response = httpx.post(
        "https://api.line.me/v2/bot/message/reply",
        headers={
            "Authorization": (
                f"Bearer {settings.LINE_BOT_CHANNEL_ACCESS_TOKEN}"
            )
        },
        json={
            "replyToken": reply_token,
            "messages": [line_message]
        },
        timeout=10
    )

    response.raise_for_status()


# ==================== Category ====================

def find_category(name, transaction_type, user):
    """Only resolve global categories or categories owned by this user."""
    return (accessible_category(name, transaction_type, user)
            or fallback_category(transaction_type, user))


# ==================== Date / Time ====================

def parse_date_time(date_time_text):
    if not date_time_text:
        return None, None

    try:
        result = datetime.strptime(
            date_time_text,
            "%Y-%m-%d %H:%M"
        )
        return result.date(), result.time()

    except (ValueError, TypeError):
        return None, None


# ==================== KaneCho Flex Card ====================

def build_transaction_flex(item):
    """การ์ดแจ้งว่าบันทึกรายการแล้ว พร้อมลิงก์แก้ไข"""
    type_label = "รายรับ" if item.transaction_type == "income" else "รายจ่าย"
    category_text = item.category.name if item.category else "ไม่ระบุ"
    if item.sub_category:
        category_text += f" / {item.sub_category}"

    # วันที่และเวลาที่บันทึกไว้ในรายการ
    date_text = "ไม่ระบุ"
    if item.transaction_date:
        date = item.transaction_date
        date_text = f"{date.day:02d}/{date.month:02d}/{date.year + 543}"

    time_text = "ไม่ระบุ"
    if item.transaction_time:
        time_text = item.transaction_time.strftime("%H:%M น.")

    frontend_url = settings.FRONTEND_URL.rstrip("/")
    query = urlencode({"returnTo": "/edit-transaction/", "transaction": item.id})
    edit_url = f"{frontend_url}/?{query}"

    def detail(value):
        return {"type": "text", "text": value, "size": "sm", "wrap": True,
                "color": "#594A3D"}

    return {
        "type": "flex",
        "altText": f"KaneCho บันทึก{type_label} {item.amount:,.2f} บาทสำเร็จ",
        "contents": {
            "type": "bubble", "size": "mega",
            "hero": {
                "type": "image",
                "url": "https://i.postimg.cc/fyCv4PPZ/Kanecho-Header.jpg",
                "size": "full", "aspectRatio": "5:2", "aspectMode": "cover"
            },
            "body": {
                "type": "box", "layout": "vertical", "backgroundColor": "#FFF9EE",
                "spacing": "md", "contents": [
                    {"type": "text", "text": "KaneCho | บันทึกรายการสำเร็จ ✓",
                     "weight": "bold", "size": "md", "color": "#805035"},
                    {"type": "text", "text": f"฿{item.amount:,.2f}",
                     "weight": "bold", "size": "xxl", "color": "#805035"},
                    {"type": "separator", "margin": "md", "color": "#E8DCC8"},
                    detail(f"ประเภท: {type_label}"),
                    detail(f"รายการ: {item.item_name or 'ไม่ระบุ'}"),
                    detail(f"หมวดหมู่: {category_text}"),
                    detail(f"ช่องทาง: {item.account or 'ไม่ระบุ'}"),
                    detail(f"วันที่: {date_text}"),
                    detail(f"เวลา: {time_text}"),
                    {"type": "text", "text": "บันทึกแล้ว หากข้อมูลไม่ถูกต้องสามารถแก้ไขได้",
                     "size": "xs", "color": "#8B7A68", "wrap": True}
                ]
            },
            "footer": {
                "type": "box", "layout": "vertical", "backgroundColor": "#FFF9EE",
                "contents": [{"type": "button", "style": "primary", "color": "#b8d95a",
                              "action": {"type": "uri", "label": "แก้ไขรายการ", "uri": edit_url}}]
            }
        }
    }
def build_transaction_preview_flex(data):

    transaction_type = data["transaction_type"]

    type_label = (
        "รายรับ"
        if transaction_type == "income"
        else "รายจ่าย"
    )

    category = None

    if data.get("category_id"):
        category = Category.objects.filter(
            pk=data["category_id"],
            transaction_type=transaction_type
        ).first()

    category_text = (
        category.name
        if category
        else "ไม่ระบุ"
    )

    if data.get("sub_category"):
        category_text += f" / {data['sub_category']}"

    amount = Decimal(str(data["amount"]))

    date_value = datetime.strptime(
        data["transaction_date"],
        "%Y-%m-%d"
    ).date()

    date_text = (
        f"{date_value.day:02d}/"
        f"{date_value.month:02d}/"
        f"{date_value.year + 543}"
    )

    time_text = data.get("transaction_time") or "-"

    if time_text != "-":
        time_text = time_text[:5] + " น."

    receipt_text = (
        "แนบรูปหลักฐานแล้ว"
        if data.get("receipt_path")
        else "ไม่ได้แนบรูปหลักฐาน"
    )

    token = data["token"]

    def detail(label, value):
        return {
            "type": "box",
            "layout": "baseline",
            "spacing": "sm",
            "contents": [
                {
                    "type": "text",
                    "text": label,
                    "size": "sm",
                    "color": "#8B7A68",
                    "flex": 3
                },
                {
                    "type": "text",
                    "text": str(value)[:200],
                    "size": "sm",
                    "color": "#594A3D",
                    "wrap": True,
                    "flex": 7
                }
            ]
        }

    return {
        "type": "flex",
        "altText": f"ตรวจสอบรายการ{type_label} {amount:,.2f} บาท",
        "contents": {
            "type": "bubble",
            "size": "mega",
            "hero": {
                "type": "image",
                "url": "https://i.postimg.cc/fyCv4PPZ/Kanecho-Header.jpg",
                "size": "full",
                "aspectRatio": "20:9",
                "aspectMode": "cover"
            },
            "body": {
                "type": "box",
                "layout": "vertical",
                "backgroundColor": "#FFF9EE",
                "spacing": "md",
                "contents": [
                    {
                        "type": "text",
                        "text": "KaneCho | ตรวจสอบรายการ",
                        "weight": "bold",
                        "size": "lg",
                        "color": "#805035"
                    },
                    {
                        "type": "text",
                        "text": f"฿{amount:,.2f}",
                        "weight": "bold",
                        "size": "xxl",
                        "color": "#805035"
                    },
                    {
                        "type": "separator",
                        "color": "#E8DCC8"
                    },
                    detail("ประเภท", type_label),
                    detail("รายการ", data.get("item_name") or "-"),
                    detail("หมวดหมู่", category_text),
                    detail("ช่องทาง", data.get("account") or "-"),
                    detail("วันที่", date_text),
                    detail("เวลา", time_text),
                    detail("รายละเอียด", data.get("description") or "-"),
                    detail("หลักฐาน", receipt_text),
                    {
                        "type": "text",
                        "text": "กรุณาตรวจสอบข้อมูลก่อนกดยืนยันบันทึก",
                        "size": "xs",
                        "color": "#8B7A68",
                        "wrap": True
                    }
                ]
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "backgroundColor": "#FFF9EE",
                "spacing": "sm",
                "contents": [
                    {
                        "type": "button",
                        "style": "primary",
                        "color": "#B8D95A",
                        "action": {
                            "type": "postback",
                            "label": "ยืนยันบันทึกรายการ",
                            "data": (
                                "action=transaction_confirm"
                                f"&token={token}"
                            ),
                            "displayText": "ยืนยันบันทึกรายการ"
                        }
                    },
                    {
                        "type": "button",
                        "style": "secondary",
                        "action": {
                            "type": "postback",
                            "label": "แก้ไขรายการ",
                            "data": (
                                "action=transaction_edit"
                                f"&token={token}"
                            ),
                            "displayText": "แก้ไขรายการ"
                        }
                    },
                    {
                        "type": "button",
                        "style": "secondary",
                        "action": {
                            "type": "postback",
                            "label": "ยกเลิกรายการ",
                            "data": (
                                "action=transaction_cancel"
                                f"&token={token}"
                            ),
                            "displayText": "ยกเลิกรายการ"
                        }
                    }
                ]
            }
        }
    }

def confirm_pending_transaction(line_user_id, user, token):
    if not token:
        return "ไม่พบรหัสรายการ กรุณาเริ่มใหม่ค่ะ"

    completed_key = f"line_transaction_completed:{line_user_id}:{token}"

    completed_id = cache.get(completed_key)

    if completed_id:
        item = Transaction.objects.filter(
            pk=completed_id,
            user=user
        ).first()

        if item:
            return build_transaction_flex(item)

    data = get_pending(line_user_id, user)
    if not data or data.get("token") != token:
        return "รายการนี้หมดอายุหรือถูกยกเลิกไปแล้วค่ะ"

    lock_key = (
        f"line_transaction_confirm_lock:{line_user_id}:{token}"
    )

    if not cache.add(
        lock_key,
        True,
        timeout=30
    ):
        return "ระบบกำลังบันทึกรายการนี้อยู่ค่ะ กรุณารอสักครู่"

    try:
        completed_id = cache.get(completed_key)
        if completed_id:
            item = Transaction.objects.filter(
                pk=completed_id,
                user=user
            ).first()
            if item:
                return build_transaction_flex(item)

        data = get_pending(line_user_id, user)

        if not data or data.get("token") != token:
            return "รายการนี้หมดอายุหรือถูกยกเลิกไปแล้วค่ะ"

        amount = Decimal(str(data["amount"]))

        if amount <= 0:
            return "จำนวนเงินไม่ถูกต้องค่ะ กรุณาเริ่มรายการใหม่"

        transaction_type = data["transaction_type"]

        if transaction_type not in ("income", "expense"):
            return "ไม่พบประเภทรายการค่ะ"

        category = None

        if data.get("category_id"):
            category = Category.objects.filter(
                pk=data["category_id"],
                transaction_type=transaction_type
            ).first()

        transaction_date = datetime.strptime(
            data["transaction_date"],
            "%Y-%m-%d"
        ).date()

        transaction_time = None

        if data.get("transaction_time"):
            transaction_time = datetime.strptime(
                data["transaction_time"],
                "%H:%M:%S"
            ).time()

        with transaction.atomic():

            item = Transaction.objects.create(
                user=user,
                amount=amount,
                transaction_type=transaction_type,
                item_name=data.get("item_name", ""),
                description=data.get("description", ""),
                category=category,
                sub_category=data.get("sub_category", ""),
                account=data.get("account", ""),
                transaction_date=transaction_date,
                transaction_time=transaction_time,
                receipt=data.get("receipt_path") or None
            )


        # Database transaction has committed successfully.
        # Redis failures must not turn a successful save into an error.
        try:
            cache.set(
                completed_key,
                item.id,
                timeout=24 * 60 * 60
            )
        except Exception:
            logger.exception(
                "Failed to cache completed LINE transaction id=%s",
                item.id
            )

        for cleanup_func in (
            clear_pending,
            clear_transaction_flow,
        ):
            try:
                cleanup_func(line_user_id)
            except Exception:
                logger.exception(
                    "Failed to clear LINE transaction state id=%s",
                    item.id
                )

        try:
            remember_recent_transaction(line_user_id, item)
        except Exception:
            logger.exception(
                "Failed to remember recent LINE transaction id=%s",
                item.id
            )

        return build_transaction_flex(item)

    finally:
        try:
            cache.delete(lock_key)
        except Exception:
            logger.exception(
                "Failed to release LINE transaction lock"
            )

def cancel_pending_transaction(line_user_id, user, token):

    data = get_pending(line_user_id, user)

    if not data or data.get("token") != token:
        return "รายการนี้หมดอายุหรือถูกยกเลิกไปแล้วค่ะ"

    receipt_path = data.get("receipt_path")

    clear_pending(line_user_id)
    clear_transaction_flow(line_user_id)

    if receipt_path:
        try:
            delete_receipt(receipt_path)

        except Exception:
            logger.exception(
                "Failed to delete cancelled transaction receipt"
            )

    return "ยกเลิกรายการเรียบร้อยแล้วค่ะ ยังไม่มีการบันทึกข้อมูล"


def recent_transaction_key(line_user_id):
    return f"line_recent_transaction:{line_user_id}"


def remember_recent_transaction(line_user_id, item):
    # เก็บรหัสรายการล่าสุดไว้ชั่วคราว
    cache.set(recent_transaction_key(line_user_id), item.id, timeout=300)


# ==================== Savings via LINE ====================

SAVINGS_TIMEOUT_SECONDS = 15 * 60


def savings_state_key(line_user_id):
    return f"line_savings_state:{line_user_id}"


def get_savings_state(line_user_id):
    return cache.get(savings_state_key(line_user_id))


def set_savings_state(line_user_id, state):
    cache.set(savings_state_key(line_user_id), state, SAVINGS_TIMEOUT_SECONDS)


def clear_savings_state(line_user_id):
    cache.delete(savings_state_key(line_user_id))


def savings_button(label, data, color="#B8D95A"):
    return {
        "type": "button", "style": "primary", "color": color,
        "action": {"type": "postback", "label": label, "data": data}
    }


def build_savings_list_flex(user):
    """แสดงกระเป๋าของเจ้าของบัญชี (LINE carousel รองรับสูงสุด 12 bubbles)"""
    savings = list(Savings.objects.filter(user=user).order_by("-created_at")[:12])
    if not savings:
        return "ยังไม่มีกระเป๋าออมค่ะ กรุณาสร้างกระเป๋าบนเว็บไซต์ KaneCho ก่อน"

    bubbles = []
    for saving in savings:
        bubbles.append({
            "type": "bubble", "size": "mega",
            "body": {
                "type": "box", "layout": "vertical", "spacing": "md",
                "backgroundColor": "#FFF9EE", "contents": [
                    {"type": "text", "text": saving.saving_name or "กระเป๋าออม",
                     "weight": "bold", "size": "xl", "wrap": True, "color": "#805035"},
                    {"type": "text", "text": f"ยอดคงเหลือ ฿{saving.balance:,.2f}",
                     "size": "md", "color": "#805035"},
                    {"type": "text", "text": f"เป้าหมาย ฿{saving.target:,.2f}",
                     "size": "sm", "color": "#8B7A68"}
                ]
            },
            "footer": {
                "type": "box", "layout": "vertical", "backgroundColor": "#FFF9EE",
                "contents": [savings_button(
                    "เลือกกระเป๋านี้", f"action=savings_select&id={saving.saving_id}"
                )]
            }
        })
    return {"type": "flex", "altText": "เลือกกระเป๋าออม KaneCho",
            "contents": {"type": "carousel", "contents": bubbles}}


def build_savings_action_flex(saving):
    return {
        "type": "flex", "altText": "เลือกฝากหรือถอนเงิน",
        "contents": {
            "type": "bubble",
            "body": {"type": "box", "layout": "vertical", "spacing": "md",
                     "backgroundColor": "#FFF9EE", "contents": [
                         {"type": "text", "text": saving.saving_name or "กระเป๋าออม",
                          "weight": "bold", "size": "xl", "wrap": True},
                         {"type": "text", "text": f"ยอดคงเหลือ ฿{saving.balance:,.2f}"}
                     ]},
            "footer": {"type": "box", "layout": "vertical", "spacing": "sm",
                       "backgroundColor": "#FFF9EE", "contents": [
                           savings_button("ฝากเงิน", f"action=savings_amount&id={saving.saving_id}&type=deposit"),
                           savings_button("ถอนเงิน", f"action=savings_amount&id={saving.saving_id}&type=withdraw")
                       ]}
        }
    }


def build_savings_confirm_flex(saving, operation, amount, token):
    label = "ฝากเงิน" if operation == "deposit" else "ถอนเงิน"
    return {
        "type": "flex", "altText": f"ยืนยัน{label} {amount:,.2f} บาท",
        "contents": {
            "type": "bubble",
            "body": {"type": "box", "layout": "vertical", "spacing": "md",
                     "backgroundColor": "#FFF9EE", "contents": [
                         {"type": "text", "text": f"ยืนยัน{label}", "weight": "bold", "size": "xl"},
                         {"type": "text", "text": saving.saving_name or "กระเป๋าออม", "wrap": True},
                         {"type": "text", "text": f"฿{amount:,.2f}", "weight": "bold", "size": "xxl"}
                     ]},
            "footer": {"type": "box", "layout": "vertical", "spacing": "sm",
                       "backgroundColor": "#FFF9EE", "contents": [
                           savings_button("ยืนยัน", f"action=savings_confirm&token={token}"),
                           savings_button("ยกเลิก", f"action=savings_cancel&token={token}", "#B0A394")
                       ]}
        }
    }


def handle_savings_postback(action, params, user, line_user_id):
    if action == "savings_select":
        try:
            saving_id = int(params.get("id", [""])[0])
        except (TypeError, ValueError):
            return "รหัสกระเป๋าไม่ถูกต้องค่ะ"
        saving = Savings.objects.filter(saving_id=saving_id, user=user).first()
        if saving is None:
            return "ไม่พบกระเป๋าออมค่ะ"
        clear_savings_state(line_user_id)
        return build_savings_action_flex(saving)

    if action == "savings_amount":
        try:
            saving_id = int(params.get("id", [""])[0])
        except (TypeError, ValueError):
            return "รหัสกระเป๋าไม่ถูกต้องค่ะ"
        operation = params.get("type", [""])[0]
        if operation not in ("deposit", "withdraw"):
            return "ประเภทการทำรายการไม่ถูกต้องค่ะ"
        saving = Savings.objects.filter(saving_id=saving_id, user=user).first()
        if saving is None:
            return "ไม่พบกระเป๋าออมค่ะ"
        set_savings_state(line_user_id, {
            "saving_id": saving_id, "operation": operation, "step": "amount"
        })
        label = "ฝาก" if operation == "deposit" else "ถอน"
        return (f"ต้องการ{label}เงินในกระเป๋า {saving.saving_name or 'กระเป๋าออม'}\n"
                "กรุณาพิมพ์จำนวนเงิน เช่น 500")

    if action in ("savings_confirm", "savings_cancel"):
        state = get_savings_state(line_user_id)
        token = params.get("token", [""])[0]
        if not state or state.get("step") != "confirm" or state.get("token") != token:
            return "รายการนี้หมดอายุหรือดำเนินการไปแล้วค่ะ"
        if action == "savings_cancel":
            clear_savings_state(line_user_id)
            return "ยกเลิกรายการการออมแล้วค่ะ"

        # ต้องตั้งค่า cache แบบแชร์ทุก worker (เช่น Redis) ก่อนใช้งานจริง
        lock_key = f"line_savings_lock:{line_user_id}"
        if not cache.add(lock_key, True, timeout=60):
            return "ระบบกำลังทำรายการ กรุณารอสักครู่ค่ะ"
        try:
            # อ่านสถานะซ้ำหลังได้ lock เพื่อป้องกันการกดยืนยันซ้ำ
            state = get_savings_state(line_user_id)
            if not state or state.get("step") != "confirm" or state.get("token") != token:
                return "รายการนี้ดำเนินการไปแล้วค่ะ"
            amount = Decimal(state["amount"])
            operation = state["operation"]
            if not amount.is_finite() or amount <= 0 or amount.as_tuple().exponent < -2:
                clear_savings_state(line_user_id)
                return "จำนวนเงินไม่ถูกต้องค่ะ"
            with transaction.atomic():
                saving = Savings.objects.select_for_update().filter(
                    saving_id=state["saving_id"], user=user
                ).first()
                if saving is None:
                    clear_savings_state(line_user_id)
                    return "ไม่พบกระเป๋าออมค่ะ"
                if operation == "deposit":
                    if saving.balance + amount > Decimal("999999.99"):
                        return "ยอดเงินเกินขีดจำกัดที่ระบบรองรับค่ะ"
                    saving.balance += amount
                    label = "ฝาก"
                elif operation == "withdraw":
                    if amount > saving.balance:
                        return "ยอดเงินในกระเป๋าไม่เพียงพอค่ะ"
                    saving.balance -= amount
                    label = "ถอน"
                else:
                    clear_savings_state(line_user_id)
                    return "ประเภทการทำรายการไม่ถูกต้องค่ะ"

                saving.save(update_fields=["balance", "updated_at"])

                SavingsTransaction.objects.create(
                    saving=saving,
                    user=user,
                    saving_name=saving.saving_name,
                    transaction_type=operation,
                    amount=amount,
                    transaction_date=timezone.localdate(),
                    balance_after=saving.balance,
                    note="ทำรายการผ่าน LINE OA",
                )

                clear_savings_state(line_user_id)
                return build_savings_success_flex(
                    saving,
                    operation,
                    amount
                )
        finally:
            cache.delete(lock_key)

    return "ไม่พบคำสั่งการออมค่ะ"


def handle_savings_amount(text, user, line_user_id):
    state = get_savings_state(line_user_id)
    if not state or state.get("step") != "amount":
        return None
    try:
        amount = Decimal(text.strip().replace(",", ""))
    except (InvalidOperation, ValueError):
        return "กรุณาพิมพ์จำนวนเงินเป็นตัวเลข เช่น 500"
    if not amount.is_finite() or amount <= 0:
        return "จำนวนเงินต้องมากกว่า 0 บาทค่ะ"
    if amount.as_tuple().exponent < -2 or amount > Decimal("999999.99"):
        return "จำนวนเงินไม่ถูกต้อง (ไม่เกิน 999,999.99 และทศนิยมไม่เกิน 2 ตำแหน่ง)"
    saving = Savings.objects.filter(saving_id=state["saving_id"], user=user).first()
    if saving is None:
        clear_savings_state(line_user_id)
        return "ไม่พบกระเป๋าออมค่ะ"
    if state["operation"] == "withdraw" and amount > saving.balance:
        return "ยอดเงินในกระเป๋าไม่เพียงพอค่ะ"
    if state["operation"] == "deposit" and saving.balance + amount > Decimal("999999.99"):
        return "ยอดเงินเกินขีดจำกัดที่ระบบรองรับค่ะ"
    token = uuid4().hex
    state.update({"amount": str(amount), "step": "confirm", "token": token})
    set_savings_state(line_user_id, state)
    return build_savings_confirm_flex(saving, state["operation"], amount, token)


# ==================== Rich Menu / Flex Postback ====================
def build_savings_success_flex(saving, operation, amount):
    label = "ฝากเงิน" if operation == "deposit" else "ถอนเงิน"

    frontend_url = settings.FRONTEND_URL.rstrip("/")
    saving_url = f"{frontend_url}/?returnTo=/saving/"

    return {
        "type": "flex",
        "altText": f"{label}สำเร็จ จำนวน {amount:,.2f} บาท",
        "contents": {
            "type": "bubble",
            "size": "mega",
            "body": {
                "type": "box",
                "layout": "vertical",
                "backgroundColor": "#FFF9EE",
                "spacing": "md",
                "contents": [
                    {
                        "type": "text",
                        "text": "KaneCho | ทำรายการสำเร็จ ✓",
                        "weight": "bold",
                        "size": "md",
                        "color": "#805035",
                        "wrap": True
                    },
                    {
                        "type": "text",
                        "text": f"{label}สำเร็จค่ะ",
                        "weight": "bold",
                        "size": "xl",
                        "color": "#805035"
                    },
                    {
                        "type": "text",
                        "text": f"฿{amount:,.2f}",
                        "weight": "bold",
                        "size": "xxl",
                        "color": "#805035"
                    },
                    {
                        "type": "separator",
                        "margin": "md",
                        "color": "#E8DCC8"
                    },
                    {
                        "type": "text",
                        "text": f"กระเป๋า: {saving.saving_name or 'กระเป๋าออม'}",
                        "size": "sm",
                        "color": "#594A3D",
                        "wrap": True
                    },
                    {
                        "type": "text",
                        "text": f"ยอดคงเหลือ: {saving.balance:,.2f} บาท",
                        "size": "sm",
                        "weight": "bold",
                        "color": "#805035",
                        "wrap": True
                    },
                    {
                        "type": "text",
                        "text": "ตรวจสอบยอดเงินและรายละเอียดการออมเพิ่มเติมได้ที่เว็บไซต์ค่ะ",
                        "size": "xs",
                        "color": "#8B7A68",
                        "wrap": True
                    }
                ]
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "backgroundColor": "#FFF9EE",
                "contents": [
                    {
                        "type": "button",
                        "style": "primary",
                        "color": "#B8D95A",
                        "action": {
                            "type": "uri",
                            "label": "ตรวจสอบ",
                            "uri": saving_url
                        }
                    }
                ]
            }
        }
    }

# สรุปรายการของวันนี้
def build_daily_summary_flex(user):
    today = timezone.localdate()

    date_text = (
        f"{today.day:02d}/"
        f"{today.month:02d}/"
        f"{today.year + 543}"
    )

    sections = []

    def make_row(label, amount=None, amount_color="#594A3D"):
        contents = [
            {
                "type": "text",
                "text": str(label)[:100],
                "size": "sm",
                "color": "#594A3D",
                "wrap": True,
                "flex": 7,
            }
        ]

        if amount is not None:
            contents.append({
                "type": "text",
                "text": f"{amount:,.2f} บาท",
                "size": "sm",
                "weight": "bold",
                "color": amount_color,
                "align": "end",
                "wrap": True,
                "flex": 4,
            })

        return {
            "type": "box",
            "layout": "baseline",
            "spacing": "sm",
            "contents": contents,
        }

    def add_section(title, rows):
        if not rows:
            return

        contents = [
            {
                "type": "text",
                "text": title,
                "weight": "bold",
                "size": "md",
                "color": "#805035",
                "wrap": True,
            },
            {
                "type": "separator",
                "color": "#E8DCC8",
            },
        ]

        contents.extend(rows)

        sections.append({
            "type": "box",
            "layout": "vertical",
            "spacing": "sm",
            "contents": contents,
        })

    # ==================== รายรับ - รายจ่าย ====================
    transactions = Transaction.objects.filter(
        user=user,
        transaction_date=today,
    ).order_by("transaction_time", "id")

    income_items = [
        item for item in transactions
        if item.transaction_type == "income"
    ]

    expense_items = [
        item for item in transactions
        if item.transaction_type == "expense"
    ]

    transaction_rows = []

    def add_transaction_group(title, items, color):
        if not items:
            return

        # หัวข้อรายรับ / รายจ่าย
        transaction_rows.append({
            "type": "text",
            "text": title,
            "weight": "bold",
            "size": "sm",
            "color": "#805035",
            "margin": "md",
        })

        # แสดงรายการแต่ละรายการ
        for item in items:
            transaction_rows.append(
                make_row(
                    f"{  item.item_name or 'ไม่ระบุชื่อรายการ'}",
                    item.amount,
                    color,
                )
            )

        # รวมยอดเงิน
        total = sum(
            (item.amount for item in items),
            Decimal("0.00")
        )

        transaction_rows.append(
            make_row("รวม:", total, color)
        )

    add_transaction_group(
        "รายรับ",
        income_items,
        "#299D68",
    )

    add_transaction_group(
        "รายจ่าย",
        expense_items,
        "#D66A6A",
    )

    add_section("รายรับ - รายจ่าย", transaction_rows)

    # ==================== การออม ====================

    savings_rows = []

    # ส่วนที่ 1: กระเป๋าออมที่สร้างวันนี้
    new_savings = Savings.objects.filter(
        user=user,
        created_at__date=today,
    ).order_by("created_at")

    if new_savings.exists():
        savings_rows.append({
            "type": "text",
            "text": "กระเป๋าออมที่เพิ่มใหม่",
            "weight": "bold",
            "size": "sm",
            "color": "#805035",
            "margin": "md",
        })

        for saving in new_savings:
            savings_rows.append(
                make_row(f"  {saving.saving_name}")
            )

    # ส่วนที่ 2: กระเป๋าที่มีการฝากหรือถอนเงินวันนี้
    saving_transactions = SavingsTransaction.objects.filter(
        user=user,
        transaction_date=today,
    ).order_by("created_at")

    saving_totals = defaultdict(lambda: Decimal("0.00"))

    for item in saving_transactions:
        saving_name = (
            item.saving_name
            or (
                item.saving.saving_name
                if item.saving
                else "กระเป๋าออม"
            )
        )

        key = (saving_name, item.transaction_type)
        saving_totals[key] += item.amount

    if saving_totals:
        savings_rows.append({
            "type": "text",
            "text": "กระเป๋าที่มีการเปลี่ยนแปลง",
            "weight": "bold",
            "size": "sm",
            "color": "#805035",
            "margin": "md",
        })

        for (saving_name, transaction_type), total in saving_totals.items():
            if transaction_type == "deposit":
                label = f"  ฝากเงินเข้ากระเป๋า {saving_name}"
                color = "#299D68"
            else:
                label = f"  ถอนเงินจากกระเป๋า {saving_name}"
                color = "#D66A6A"

            savings_rows.append(
                make_row(label, total, color)
            )

    add_section("การออม", savings_rows)

    # ==================== หนี้สิน ====================

    debt_rows = []

    # ส่วนที่ 1: รายการหนี้ / ให้ยืมที่สร้างวันนี้
    new_debts = Debts.objects.filter(
        user=user,
        created_at__date=today,
    ).order_by("created_at")

    if new_debts.exists():
        debt_rows.append({
            "type": "text",
            "text": "รายการหนี้ / ให้ยืมที่เพิ่มใหม่",
            "weight": "bold",
            "size": "sm",
            "color": "#805035",
            "margin": "md",
        })

        for debt in new_debts:
            if debt.type == "borrowed":
                label = f"  สร้างรายการหนี้ {debt.name}"
            else:
                label = f"  สร้างรายการให้ยืม {debt.name}"

            debt_rows.append(make_row(label))

    # ส่วนที่ 2: รายการหนี้ที่มีการชำระเงินวันนี้
    payments = Payments.objects.filter(
        debt__user=user,
        paid_date=today,
        paid_amount__gt=0,
    ).select_related("debt").order_by("created_at")

    debt_totals = defaultdict(lambda: Decimal("0.00"))
    debt_names = {}

    for payment in payments:
        debt = payment.debt

        key = (debt.id, debt.type)
        debt_totals[key] += payment.paid_amount
        debt_names[key] = debt.name

    if debt_totals:
        debt_rows.append({
            "type": "text",
            "text": "รายการหนี้ที่มีการเปลี่ยนแปลง",
            "weight": "bold",
            "size": "sm",
            "color": "#805035",
            "margin": "md",
        })

        for (debt_id, debt_type), total in debt_totals.items():
            debt_name = debt_names[(debt_id, debt_type)]

            if debt_type == "borrowed":
                label = f"  ชำระหนี้ให้รายการ {debt_name}"
            else:
                label = f"  ได้รับชำระหนี้จากรายการ {debt_name}"

            debt_rows.append(
                make_row(label, total, "#299D68")
            )

    add_section("หนี้สิน", debt_rows)

    # ==================== Flex Message ====================

    if not sections:
        sections.append({
            "type": "text",
            "text": "วันนี้ยังไม่มีรายการที่บันทึกไว้ค่ะ 😊",
            "size": "sm",
            "color": "#8B7A68",
            "wrap": True,
        })

    return {
        "type": "flex",
        "altText": f"สรุปรายการวันที่ : {date_text}",
        "contents": {
            "type": "bubble",
            "size": "mega",
            "body": {
                "type": "box",
                "layout": "vertical",
                "backgroundColor": "#FFF9EE",
                "spacing": "lg",
                "contents": [
                    {
                        "type": "text",
                        "text": "KaneCho | สรุปรายการวันนี้",
                        "weight": "bold",
                        "size": "lg",
                        "color": "#805035",
                    },
                    {
                        "type": "text",
                        "text": date_text,
                        "size": "sm",
                        "color": "#8B7A68",
                    },
                    {
                        "type": "separator",
                        "color": "#E8DCC8",
                    },
                    *sections,
                ],
            },
        },
    }

def handle_postback(data, line_user_id):
    params = parse_qs(data)

    action = params.get("action", [""])[0]
    record_type = params.get("type", [""])[0]

    user = User.objects.filter(
        line_uid=line_user_id
    ).first()

    if user is None:
        return "กรุณาเข้าสู่ระบบและเชื่อมบัญชี LINE ก่อนค่ะ"

    # สรุปรายการวันนี้
    if action == "summary_today":
        return build_daily_summary_flex(user)

    #=====================จดหนี้สิน========================
    if action == "debt_select":
        try:
            debt_id = int(
                params.get("debt_id", [""])[0]
            )
        except (TypeError, ValueError):
            return "ไม่พบรหัสรายการหนี้ค่ะ"

        debt = Debts.objects.filter(
            pk=debt_id,
            user=user,
            type="borrowed",
            status="ongoing",
            remaining_amount__gt=0,
        ).first()

        if debt is None:
            return "ไม่พบรายการหนี้ หรือรายการนี้ชำระครบแล้วค่ะ"

        clear_debt_flow(line_user_id)

        set_debt_flow(line_user_id, {
            "step": "await_amount",
            "debt_id": debt.pk,
        })

        return (
            f"คุณเลือกรายการ: {debt.name}\n\n"
            f"ยอดหนี้คงเหลือ: "
            f"{debt.remaining_amount:,.2f} บาท\n\n"
            "กรุณาพิมพ์จำนวนเงินที่ต้องการชำระค่ะ\n"
            "ตัวอย่าง: 500 หรือ 500 บาท"
        )

    if action == "debt_finish_without_image":
        state = get_debt_flow(line_user_id)

        if (
            not state
            or state.get("step") != "await_image"
        ):
            return "รายการนี้หมดอายุหรือดำเนินการไปแล้วค่ะ"

        return save_line_debt_payment(
            user=user,
            line_user_id=line_user_id,
        )

    # ==================== Transaction Preview ====================
    if action == "transaction_finish_without_image":

        data = get_pending(line_user_id, user)
        flow = get_transaction_flow(line_user_id)

        if (
            data is None
            or not flow
            or flow.get("step") != "await_image"
        ):
            return "รายการนี้หมดอายุหรือดำเนินการไปแล้วค่ะ"

        if not data.get("amount"):
            return "ไม่พบจำนวนเงิน กรุณาระบุรายละเอียดรายการก่อนค่ะ"

        set_transaction_flow(
            line_user_id,
            {"step": "await_confirmation"}
        )

        return build_transaction_preview_flex(data)

    if action == "transaction_edit":

        token = params.get("token", [""])[0]
        data = get_pending(line_user_id, user)
        flow = get_transaction_flow(line_user_id)

        if (
            not data
            or data.get("token") != token
            or not flow
            or flow.get("step") != "await_confirmation"
        ):
            return "รายการนี้หมดอายุหรือดำเนินการไปแล้วค่ะ"

        set_transaction_flow(
            line_user_id,
            {"step": "await_note"}
        )

        return (
            "กรุณาส่งรายละเอียดรายการที่แก้ไขพร้อมจำนวนเงินค่ะ\n"
            "เช่น ซื้อกาแฟ 85 บาท กสิกร"
        )

    if action == "transaction_confirm":

        token = params.get("token", [""])[0]

        return confirm_pending_transaction(
            line_user_id,
            user,
            token
        )

    if action == "transaction_cancel":

        token = params.get("token", [""])[0]

        return cancel_pending_transaction(
            line_user_id,
            user,
            token
        )
     #=====================จดการออม========================
    # เปิดรายการกระเป๋าออมจาก Rich Menu
    if action == "view_savings" or (
        action == "select_record" and record_type in ("saving", "savings")
    ):
        clear_savings_state(line_user_id)
        return build_savings_list_flex(user)

    if action.startswith("savings_"):
        return handle_savings_postback(action, params, user, line_user_id)

    #=============================================================================
        # ปุ่มอนุมัติรายการชำระหนี้จาก LINE
    if action == "payment_approve":
        try:
            payment_id = int(
                params.get("payment_id", [""])[0]
            )
        except (TypeError, ValueError):
            return "รหัสรายการชำระเงินไม่ถูกต้องค่ะ"

        return approve_payment_from_line(
            payment_id=payment_id,
            creditor=user,
        )

     # ปุ่มยอมรับ/ปฏิเสธคำขอเป็นเพื่อนจาก LINE
    if action in ("friend_accept", "friend_reject"):
        try:
            friend_id = int(
                params.get("friend_id", [""])[0]
            )
        except (TypeError, ValueError):
            return "รหัสคำขอเป็นเพื่อนไม่ถูกต้องค่ะ"

        # ต้องเป็นผู้รับคำขอที่ยังรอการตอบรับเท่านั้น
        friend_request = Friends.objects.filter(
            id=friend_id,
            receiver=user,
            status="pending",
        ).first()

        if friend_request is None:
            return (
                "ไม่พบคำขอที่รอการตอบรับ "
                "หรือคำขอนี้ได้รับการดำเนินการแล้วค่ะ"
            )

        if action == "friend_accept":
            friend_request.status = "accepted"
            friend_request.save(update_fields=["status"])

            return "ยอมรับคำขอเป็นเพื่อนเรียบร้อยแล้วค่ะ"

        friend_request.status = "rejected"
        friend_request.save(update_fields=["status"])

        return "ปฏิเสธคำขอเป็นเพื่อนเรียบร้อยแล้วค่ะ"

    # การ์ดแบบใหม่ไม่มีปุ่มยืนยันหรือยกเลิกแล้ว
    if action in ("confirm", "cancel", "edit"):
        return "ปุ่มนี้หมดอายุแล้วค่ะ กรุณาเริ่มบันทึกรายการใหม่"

    # ปุ่มเลือกโหมดจาก Rich Menu
    if action != "select_record":
        return "เมนูนี้ยังไม่เปิดใช้งานค่ะ"

    if record_type == "debt":
        clear_debt_flow(line_user_id)
        return build_line_debt_list_flex(user)

    if record_type not in ("income", "expense"):
        return "เมนูนี้ยังไม่เปิดใช้งานค่ะ"

    clear_debt_flow(line_user_id)
    clear_savings_state(line_user_id)

    previous = get_record_mode(line_user_id)
    if previous and previous != record_type:

        pending_data = get_pending(
            line_user_id,
            user
        )

        if pending_data:
            receipt_path = pending_data.get("receipt_path")

            if receipt_path:
                try:
                    delete_receipt(receipt_path)

                except Exception:
                    logger.exception(
                        "Failed to delete receipt when changing record mode"
                    )

        clear_pending(line_user_id)
        clear_transaction_flow(line_user_id)

        cache.delete(
            recent_transaction_key(line_user_id)
        )

    set_record_mode(
        line_user_id,
        record_type
    )

    label = (
        "รายรับ"
        if record_type == "income"
        else "รายจ่าย"
    )

    example = (
        "พาร์ทไทม์ 400"
        if record_type == "income"
        else "ซื้อกาแฟ 30"
    )

    return (
        f"เลือกโหมดจด{label}แล้วค่ะ\n"
        "สามารถส่งข้อความบันทึกรายการ "
        "และแนบรูปภาพเพื่อเป็นหลักฐานได้เลยค่ะ\n"
        f"เช่น {example}"
    )

# ==================== Text Message ====================

def handle_text_message(text, line_user_id):

    user = User.objects.filter(
        line_uid=line_user_id
    ).first()

    if user is None:
        return (
            "ยังไม่พบบัญชีที่เชื่อมกับ LINE นี้ "
            "กรุณาเข้าสู่ระบบด้วย LINE เดียวกันก่อน"
        )

    command = text.strip()

    savings_answer = handle_savings_amount(
        command, user, line_user_id
    )

    if savings_answer is not None:
        return savings_answer

    # ==================== Debt Payment Text ====================

    debt_state = get_debt_flow(line_user_id)

    if debt_state:

        if debt_state.get("step") == "await_amount":
            # รองรับ 500, 500.50, 1,000 และ 1,000 บาท
            amount_text = (
                command
                .replace(",", "")
                .replace("บาท", "")
                .strip()
            )

            if not re.fullmatch(
                r"\d+(?:\.\d{1,2})?",
                amount_text,
            ):
                return (
                    "รูปแบบจำนวนเงินไม่ถูกต้องค่ะ\n"
                    "กรุณาพิมพ์เป็นตัวเลข เช่น 500 หรือ 500.50"
                )

            try:
                amount = Decimal(amount_text)
            except InvalidOperation:
                return "จำนวนเงินไม่ถูกต้องค่ะ กรุณาลองใหม่อีกครั้ง"

            if amount <= 0:
                return "จำนวนเงินต้องมากกว่า 0 บาทค่ะ"

            debt = Debts.objects.filter(
                pk=debt_state.get("debt_id"),
                user=user,
                type="borrowed",
                status="ongoing",
                remaining_amount__gt=0,
            ).first()

            if debt is None:
                clear_debt_flow(line_user_id)
                return "ไม่พบรายการหนี้ หรือรายการนี้ชำระครบแล้วค่ะ"

            # ตรวจสอบยอดคงเหลือเบื้องต้น
            recalculate_debt_remaining(debt)
            debt.refresh_from_db()

            if amount > debt.remaining_amount:
                return (
                    f"จำนวนเงินเกินยอดหนี้คงเหลือค่ะ\n"
                    f"ยอดที่สามารถชำระได้สูงสุด "
                    f"{debt.remaining_amount:,.2f} บาท"
                )

            debt_state.update({
                "step": "await_image",
                "amount": str(amount),
            })

            set_debt_flow(line_user_id, debt_state)

            return build_debt_attach_image_flex()

        if debt_state.get("step") == "await_image":
            return (
                "ระบบกำลังรอรูปหลักฐานการชำระเงินค่ะ\n"
                "กรุณาส่งรูปภาพ หรือกดปุ่ม "
                "'ไม่แนบรูป / บันทึกเลย' จากข้อความก่อนหน้า"
            )

    data = get_pending(line_user_id, user)
    flow = get_transaction_flow(line_user_id)

    # ==========================================
    # 1. รูปมาก่อน รอข้อความรายละเอียด
    # ==========================================

    if flow and flow.get("step") in ("await_note", "await_amount"):

        if not data:
            clear_transaction_flow(line_user_id)

            return (
                "รายการหมดอายุแล้วค่ะ "
                "กรุณาเริ่มบันทึกรายการใหม่อีกครั้ง"
            )

        transaction_type = data["transaction_type"]

        result = parse_financial_message(
            command,
            transaction_type
        )

        if result and result.get("success"):

            parsed_amount = result.get("amount")

            if parsed_amount and parsed_amount > 0:
                data["amount"] = str(parsed_amount)

            data["item_name"] = (
                result.get("item_name")
                or data.get("item_name")
                or command
            )

            if result.get("description") is not None:
                data["description"] = result["description"]

            category = match_category(
                command,
                transaction_type,
                user,
                rule_category=result.get("category") or "อื่นๆ"
            )

            if category:
                data["category_id"] = category.pk

            if result.get("sub_category"):
                data["sub_category"] = result["sub_category"]

            if result.get("account"):
                data["account"] = result["account"]

        else:

            if any(char.isdigit() for char in command):

                return (
                    result.get(
                        "message",
                        "กรุณาระบุจำนวนเงินให้ชัดเจนค่ะ"
                    )
                    if result
                    else "กรุณาระบุจำนวนเงินให้ชัดเจนค่ะ"
                )

            if not data.get("amount"):
                return (
                    "ยังไม่พบจำนวนเงินค่ะ "
                    "กรุณาพิมพ์ชื่อรายการพร้อมจำนวนเงิน "
                    "เช่น กาแฟ 80 บาท"
                )

            data["description"] = command

            if not data.get("item_name"):
                data["item_name"] = command

        if not data.get("amount") or Decimal(str(data["amount"])) <= 0:

            return (
                "ยังไม่พบจำนวนเงินของรายการค่ะ "
                "กรุณาส่งรายละเอียดพร้อมจำนวนเงิน "
                "เช่น ซื้อกาแฟ 85 บาท"
            )

        set_pending(line_user_id, data)

        set_transaction_flow(
            line_user_id,
            {"step": "await_confirmation"}
        )

        return build_transaction_preview_flex(data)

    # ==========================================
    # 2. ข้อความมาก่อน รอรูปภาพ
    # ==========================================

    if flow and flow.get("step") == "await_image":

        return (
            "ได้รับข้อมูลรายการแล้วค่ะ\n"
            "หากต้องการแนบรูปหลักฐาน กรุณาส่งภายใน 30 นาที "
            "นับจากเวลาที่ระบบรับรายการค่ะ\n"
            "หรือกดปุ่ม 'ไม่แนบรูป / ตรวจสอบรายการ' "
            "จากการ์ดก่อนหน้าเพื่อดำเนินการต่อค่ะ"
        )

    # ==========================================
    # 3. ตรวจสอบโหมดรายรับ / รายจ่าย
    # ==========================================

    transaction_type = get_record_mode(line_user_id)

    if transaction_type not in ("income", "expense"):

        return (
            "กรุณากดจดรายรับหรือจดรายจ่าย "
            "จาก Rich Menu ก่อนค่ะ"
        )

    result = parse_financial_message(
        command,
        transaction_type
    )

    if not result or not result.get("success"):

        return (
            result.get(
                "message",
                "ไม่สามารถวิเคราะห์ข้อความได้ค่ะ"
            )
            if result
            else "ไม่สามารถวิเคราะห์ข้อความได้ค่ะ"
        )

    amount = result.get("amount")

    if not amount or amount <= 0:
        return "ไม่พบจำนวนเงิน กรุณาระบุจำนวนเงินให้ถูกต้องค่ะ"

    parsed_category = (
        result.get("category") or "อื่นๆ"
    )

    category = match_category(
        command,
        transaction_type,
        user,
        rule_category=parsed_category
    )

    if category is None:
        category = find_category(
            "อื่นๆ",
            transaction_type,
            user
        )

    now = timezone.localtime()

    data = {
        "token": uuid4().hex,
        "user_id": user.uid,
        "amount": str(amount),
        "transaction_type": transaction_type,
        "item_name": result.get("item_name") or "",
        "description": result.get("description") or "",
        "category_id": category.pk if category else None,
        "sub_category": result.get("sub_category") or "",
        "account": result.get("account") or "",
        "transaction_date": now.date().isoformat(),
        "transaction_time": now.time().replace(
            microsecond=0
        ).strftime("%H:%M:%S"),
        "receipt_path": None
    }

    set_pending(
        line_user_id,
        data
    )

    set_transaction_flow(
        line_user_id,
        {"step": "await_image"}
    )

    return build_attach_receipt_flex()

# ==================== Image Message / OCR ====================

def attach_receipt_to_pending(data, image_bytes, message_id):
    """Upload a transaction receipt without changing pending data on failure."""
    old_path = data.get("receipt_path")

    try:
        path = upload_receipt(
            image_bytes,
            f"line_{message_id}.jpg"
        )
        if not path:
            raise ValueError("Supabase returned empty receipt path")
    except Exception as error:
        logger.exception(
            "LINE transaction receipt upload failed: %s",
            error
        )
        return False

    data["receipt_path"] = path

    if old_path and old_path != path:
        try:
            delete_receipt(old_path)
        except Exception:
            logger.exception(
                "Failed to delete previous transaction receipt"
            )

    return True


def handle_image_message(message_id, line_user_id):

    user = User.objects.filter(
        line_uid=line_user_id
    ).first()

    if user is None:
        return "กรุณาเข้าสู่ระบบด้วย LINE เดียวกันก่อนส่งรูปค่ะ"

    if not message_id:
        return "ไม่พบรหัสรูปภาพ กรุณาส่งรูปใหม่ค่ะ"

    # ==================== Debt Payment Image ====================

    debt_state = get_debt_flow(line_user_id)

    if debt_state:

        if debt_state.get("step") != "await_image":
            return (
                "กรุณาระบุจำนวนเงินที่ต้องการชำระ "
                "ก่อนส่งรูปหลักฐานค่ะ"
            )

        try:

            response = httpx.get(
                (
                    "https://api-data.line.me/v2/bot/message/"
                    f"{message_id}/content"
                ),
                headers={
                    "Authorization": (
                        f"Bearer {settings.LINE_BOT_CHANNEL_ACCESS_TOKEN}"
                    )
                },
                timeout=20
            )

            response.raise_for_status()

            image_bytes = response.content

            if len(image_bytes) > 5 * 1024 * 1024:
                return "รูปภาพใหญ่เกิน 5 MB กรุณาส่งรูปใหม่ค่ะ"

            return save_line_debt_payment(
                user=user,
                line_user_id=line_user_id,
                image_bytes=image_bytes,
                message_id=message_id
            )

        except httpx.HTTPError as error:

            logger.exception(
                "LINE debt image download failed: %s",
                error
            )

            return (
                "ดาวน์โหลดรูปจาก LINE ไม่สำเร็จค่ะ "
                "กรุณาส่งรูปอีกครั้ง"
            )

    # ==================== Savings Check ====================

    if get_savings_state(line_user_id):

        return (
            "ขณะนี้กำลังทำรายการการออม "
            "กรุณากรอกจำนวนเงินหรือยกเลิกจากการ์ดค่ะ"
        )

    transaction_type = get_record_mode(line_user_id)

    if transaction_type not in ("income", "expense"):

        return (
            "กรุณากดจดรายรับหรือจดรายจ่าย "
            "จาก Rich Menu ก่อนส่งรูปค่ะ"
        )

    # ==================== Download Image ====================

    try:

        response = httpx.get(
            (
                "https://api-data.line.me/v2/bot/message/"
                f"{message_id}/content"
            ),
            headers={
                "Authorization": (
                    f"Bearer {settings.LINE_BOT_CHANNEL_ACCESS_TOKEN}"
                )
            },
            timeout=20
        )

        response.raise_for_status()

        image_bytes = response.content

        if len(image_bytes) > 5 * 1024 * 1024:
            return "รูปภาพใหญ่เกิน 5 MB กรุณาส่งรูปใหม่ค่ะ"

    except httpx.HTTPError as error:

        logger.exception(
            "LINE transaction image download failed: %s",
            error
        )

        return (
            "ดาวน์โหลดรูปจาก LINE ไม่สำเร็จค่ะ "
            "กรุณาส่งรูปอีกครั้ง"
        )

    data = get_pending(
        line_user_id,
        user
    )

    flow = get_transaction_flow(line_user_id)

    # ==========================================
    # 1. ข้อความมาก่อน แล้วส่งรูปตามมา
    # ==========================================

    if (
        data is not None
        and flow
        and flow.get("step") == "await_image"
    ):

        if not attach_receipt_to_pending(
            data,
            image_bytes,
            message_id
        ):
            return (
                "อัปโหลดรูปหลักฐานไม่สำเร็จค่ะ "
                "กรุณาส่งรูปอีกครั้ง ข้อมูลรายการเดิมยังอยู่"
            )

        set_pending(
            line_user_id,
            data
        )

        set_transaction_flow(
            line_user_id,
            {"step": "await_confirmation"}
        )

        return build_transaction_preview_flex(data)

    # ==========================================
    # 2. รูปมาก่อน รอข้อความรายละเอียด
    # ==========================================

    if (
        data is not None
        and flow
        and flow.get("step") == "await_note"
    ):

        if not attach_receipt_to_pending(
            data,
            image_bytes,
            message_id
        ):
            return (
                "อัปโหลดรูปหลักฐานไม่สำเร็จค่ะ "
                "กรุณาส่งรูปอีกครั้ง ข้อมูลรายการเดิมยังอยู่"
            )

        set_pending(
            line_user_id,
            data
        )

        return build_image_note_prompt()

    # ==========================================
    # 3. มีรายการรอยืนยันและส่งรูปเพิ่มเติม
    # ==========================================

    if (
        data is not None
        and flow
        and flow.get("step") == "await_confirmation"
    ):

        if not attach_receipt_to_pending(
            data,
            image_bytes,
            message_id
        ):
            return (
                "อัปโหลดรูปหลักฐานไม่สำเร็จค่ะ "
                "กรุณาส่งรูปอีกครั้ง ข้อมูลรายการเดิมยังอยู่"
            )

        set_pending(
            line_user_id,
            data
        )

        return build_transaction_preview_flex(data)

    # ==========================================
    # 4. ส่งรูปมาก่อน
    # ==========================================

    now = timezone.localtime()

    category = find_category(
        "อื่นๆ",
        transaction_type,
        user
    )

    data = {
        "token": uuid4().hex,
        "user_id": user.uid,
        "amount": None,
        "transaction_type": transaction_type,
        "item_name": "",
        "description": "",
        "category_id": category.pk if category else None,
        "sub_category": "",
        "account": "",
        "transaction_date": now.date().isoformat(),
        "transaction_time": now.time().replace(
            microsecond=0
        ).strftime("%H:%M:%S"),
        "receipt_path": None
    }

    if not attach_receipt_to_pending(
        data,
        image_bytes,
        message_id
    ):
        return (
            "อัปโหลดรูปหลักฐานไม่สำเร็จค่ะ "
            "กรุณาส่งรูปอีกครั้ง"
        )

    set_pending(
        line_user_id,
        data
    )

    set_transaction_flow(
        line_user_id,
        {"step": "await_note"}
    )

    return build_image_note_prompt()
# ==================== LINE Webhook ====================

@csrf_exempt
def line_webhook(request):

    if request.method != "POST":
        return JsonResponse({
            "message": "LINE Webhook is working"
        })

    if (
        not settings.LINE_BOT_CHANNEL_SECRET
        or not settings.LINE_BOT_CHANNEL_ACCESS_TOKEN
    ):
        return JsonResponse(
            {
                "error": "LINE credentials not configured"
            },
            status=503
        )

    # ตรวจสอบ LINE Signature
    signature = request.headers.get(
        "X-Line-Signature",
        ""
    )

    expected_signature = base64.b64encode(
        hmac.new(
            settings.LINE_BOT_CHANNEL_SECRET.encode(),
            request.body,
            hashlib.sha256
        ).digest()
    ).decode()

    if not hmac.compare_digest(
        signature,
        expected_signature
    ):
        return JsonResponse(
            {
                "error": "Invalid LINE signature"
            },
            status=400
        )

    try:
        payload = json.loads(
            request.body.decode("utf-8")
        )

    except (UnicodeDecodeError, json.JSONDecodeError):
        return JsonResponse(
            {
                "error": "Invalid JSON"
            },
            status=400
        )

    for event in payload.get("events", []):

        event_type = event.get("type")

        if event_type not in ("message", "postback"):
            continue

        message = event.get("message") or {}

        line_user_id = (
            event.get("source") or {}
        ).get("userId")

        if not line_user_id:
            continue

        # กัน LINE ส่ง Event เดิมซ้ำ (ต้องใช้ cache ที่แชร์กันทุก worker)
        event_id = event.get("webhookEventId") or message.get("id")
        event_key = f"line_event:{event_id}" if event_id else None
        if event_key:
            try:
                if not cache.add(event_key, True, timeout=86400):
                    continue
            except Exception:
                logger.exception("LINE event deduplication cache unavailable")
                return JsonResponse(
                    {"error": "Webhook temporarily unavailable"},
                    status=503,
                )

        try:

            # Rich Menu หรือปุ่มบน Flex Card
            if event_type == "postback":

                answer = handle_postback(
                    (
                        event.get("postback") or {}
                    ).get("data", ""),
                    line_user_id
                )

            # ข้อความ
            elif message.get("type") == "text":

                answer = handle_text_message(
                    message.get("text", ""),
                    line_user_id
                )

            # รูปภาพ
            elif message.get("type") == "image":

                answer = handle_image_message(
                    message.get("id"),
                    line_user_id
                )

            else:
                continue


        except Exception:
            logger.exception("LINE event processing failed")
            if event_key:
                try:
                    cache.delete(event_key)
                except Exception:
                    logger.exception("LINE event cache cleanup failed")
            # Return a non-2xx response so LINE can redeliver when enabled.
            # Previously completed events are skipped using their event IDs.
            # Do not send an error reply here: it may consume the reply token
            # before the event is retried.
            return JsonResponse(
                {"error": "Webhook event processing failed"},
                status=503,
            )

        # Event processing has completed. A failed LINE reply must not
        # release the deduplication key and re-run financial side effects.
        try:
            reply_to_line(
                event.get("replyToken"),
                answer,
            )
        except Exception:
            logger.exception("LINE reply failed after event processing")
            # Preserve the processed-event key. Return 503 for the current
            # webhook contract; redelivery will skip this event.
            return JsonResponse(
                {"error": "LINE reply failed after event processing"},
                status=503,
            )

    return JsonResponse({"status": "ok"})