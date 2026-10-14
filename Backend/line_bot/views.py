
"""LINE OA: บันทึกด้วยข้อความ รูปสลิป และข้อความพร้อมรูปหลักฐาน"""

import base64
import hashlib
import hmac
import json
import logging

from datetime import datetime
from io import BytesIO
from urllib.parse import parse_qs

import httpx

from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from .parser import parse_financial_message
from .models import LineRecordMode
from .supabase_storage import upload_receipt

from categories.models import Category
from transactions.models import TransactionDraft
from transactions.services import confirm_transaction_draft
from transactions.ocr import (
    read_receipt,
    get_receipt_amount,
    extract_datetime,
)
from users.models import User


logger = logging.getLogger(__name__)

PENDING_TIMEOUT_SECONDS = 24 * 60 * 60


# ==================== Pending Draft ====================

def pending_key(line_user_id):
    return f"line_pending_transaction:{line_user_id}"


def get_pending(line_user_id, user):
    draft_id = cache.get(pending_key(line_user_id))

    if not draft_id:
        return None

    draft = TransactionDraft.objects.filter(
        id=draft_id,
        user=user,
        status="pending"
    ).first()

    if draft is None:
        cache.delete(pending_key(line_user_id))

    return draft


def set_pending(line_user_id, draft):
    cache.set(
        pending_key(line_user_id),
        draft.id,
        timeout=PENDING_TIMEOUT_SECONDS
    )


def clear_pending(line_user_id):
    cache.delete(pending_key(line_user_id))


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

def find_category(name, transaction_type):
    for candidate in [name, "อื่นๆ", "อื่น"]:
        if not candidate:
            continue

        category = Category.objects.filter(
            name=candidate,
            transaction_type=transaction_type
        ).first()

        if category:
            return category

    return None


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

def build_transaction_flex(draft):
    """สร้าง Flex Card สำหรับตรวจสอบรายการก่อนบันทึก"""

    type_label = (
        "รายรับ"
        if draft.transaction_type == "income"
        else "รายจ่าย"
    )

    amount_text = (
        f"฿{draft.amount:,.2f}"
        if draft.amount is not None
        else "ยังไม่ระบุยอด"
    )

    category_text = (
        draft.category.name
        if draft.category
        else "ไม่ระบุ"
    )

    if draft.sub_category:
        category_text += f" / {draft.sub_category}"

    def detail(text):
        return {
            "type": "text",
            "text": text,
            "size": "sm",
            "color": "#594A3D",
            "wrap": True
        }

    return {
        "type": "flex",
        "altText": (
            f"KaneCho ตรวจสอบรายการ{type_label} {amount_text}"
        ),
        "contents": {
            "type": "bubble",
            "size": "mega",
            "hero": {
                "type": "image",
                "url": (
                    "https://i.postimg.cc/fyCv4PPZ/"
                    "Kanecho-Header.jpg"
                ),
                "size": "full",
                "aspectRatio": "5:2",
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
                        "size": "md",
                        "color": "#805035"
                    },
                    {
                        "type": "text",
                        "text": amount_text,
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
                        "type": "box",
                        "layout": "vertical",
                        "spacing": "md",
                        "margin": "md",
                        "contents": [
                            detail(f"ประเภท: {type_label}"),
                            detail(
                                f"รายการ: "
                                f"{draft.description or 'ไม่ระบุ'}"
                            ),
                            detail(
                                f"หมวดหมู่: {category_text}"
                            ),
                            detail(
                                f"ช่องทาง: "
                                f"{draft.account or 'ไม่ระบุ'}"
                            )
                        ]
                    },
                    {
                        "type": "separator",
                        "margin": "md",
                        "color": "#E8DCC8"
                    },
                    {
                        "type": "text",
                        "text": "กรุณาตรวจสอบข้อมูลก่อนยืนยัน",
                        "size": "xs",
                        "color": "#8B7A68",
                        "align": "center",
                        "margin": "md"
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
                        "color": "#b8d95a",
                        "action": {
                            "type": "postback",
                            "label": "ยืนยันรายการ",
                            "data": (
                                f"action=confirm&draft_id={draft.id}"
                            )
                        }
                    },
                    {
                        "type": "box",
                        "layout": "horizontal",
                        "spacing": "sm",
                        "contents": [
                            {
                                "type": "button",
                                "style": "secondary",
                                "action": {
                                    "type": "postback",
                                    "label": "แก้ไข",
                                    "data": (
                                        f"action=edit&draft_id={draft.id}"
                                    )
                                }
                            },
                            {
                                "type": "button",
                                "style": "secondary",
                                "action": {
                                    "type": "postback",
                                    "label": "ยกเลิก",
                                    "data": (
                                        f"action=cancel&draft_id={draft.id}"
                                    )
                                }
                            }
                        ]
                    }
                ]
            }
        }
    }


def show_pending(draft):
    return build_transaction_flex(draft)


# ==================== Rich Menu / Flex Postback ====================

def handle_postback(data, line_user_id):
    params = parse_qs(data)

    action = params.get("action", [""])[0]
    record_type = params.get("type", [""])[0]

    user = User.objects.filter(
        line_uid=line_user_id
    ).first()

    if user is None:
        return "กรุณาเข้าสู่ระบบและเชื่อมบัญชี LINE ก่อนค่ะ"

    # ปุ่มจาก Flex Card
    if action in ("confirm", "cancel", "edit"):

        try:
            draft_id = int(
                params.get("draft_id", [""])[0]
            )
        except (TypeError, ValueError):
            return "รหัสรายการไม่ถูกต้องค่ะ"

        # ตรวจว่า Draft เป็นของผู้ใช้คนนี้
        draft = TransactionDraft.objects.filter(
            id=draft_id,
            user=user,
            status="pending"
        ).first()

        if draft is None:
            return (
                "ไม่พบรายการที่รอยืนยัน "
                "หรือรายการนี้ดำเนินการไปแล้วค่ะ"
            )

        # แก้ไขรายการ
        if action == "edit":
            set_pending(line_user_id, draft)
            return (
                "ส่งข้อความรายการใหม่เพื่อแก้ไขได้เลยค่ะ\n"
                "เช่น กาแฟ 120 บาท กสิกร"
            )

        # ยกเลิกรายการ
        if action == "cancel":
            with transaction.atomic():
                locked = (
                    TransactionDraft.objects
                    .select_for_update()
                    .filter(
                        id=draft_id,
                        user=user,
                        status="pending"
                    )
                    .first()
                )

                if locked is None:
                    return "รายการนี้ดำเนินการไปแล้วค่ะ"

                locked.status = "cancelled"
                locked.save(update_fields=["status"])

            if cache.get(pending_key(line_user_id)) == draft_id:
                clear_pending(line_user_id)

            return "ยกเลิกรายการแล้วค่ะ"

        # ยืนยันรายการ
        new_transaction, error = confirm_transaction_draft(
            draft_id=draft_id,
            user=user
        )

        if error:
            return error

        if cache.get(pending_key(line_user_id)) == draft_id:
            clear_pending(line_user_id)

        label = (
            "รายรับ"
            if new_transaction.transaction_type == "income"
            else "รายจ่าย"
        )

        return (
            f"บันทึก{label}สำเร็จค่ะ "
            f"(#{new_transaction.id})\n"
            f"{new_transaction.amount:,.2f} บาท"
        )

    # ปุ่มเลือกโหมดจาก Rich Menu
    if action != "select_record":
        return "เมนูนี้ยังไม่เปิดใช้งานค่ะ"

    if record_type not in ("income", "expense"):
        return "เมนูจดหนี้สิน/การออมยังไม่เปิดใช้งานค่ะ"

    previous = LineRecordMode.objects.filter(
        user=user
    ).first()

    # เปลี่ยนโหมดแล้ว ยกเลิก Draft ที่ยังค้าง
    if previous and previous.transaction_type != record_type:
        draft = get_pending(line_user_id, user)

        if draft is not None:
            draft.status = "cancelled"
            draft.save(update_fields=["status"])
            clear_pending(line_user_id)

    LineRecordMode.objects.update_or_create(
        user=user,
        defaults={
            "transaction_type": record_type
        }
    )

    label = (
        "รายรับ"
        if record_type == "income"
        else "รายจ่าย"
    )

    return (
        f"เลือกโหมดจด{label}แล้วค่ะ "
        "ส่งข้อความหรือรูปภาพได้เลย"
    )


def get_record_mode(user):
    return (
        LineRecordMode.objects
        .filter(user=user)
        .values_list("transaction_type", flat=True)
        .first()
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
    draft = get_pending(line_user_id, user)

    # ยกเลิกด้วยข้อความ
    if command == "ยกเลิก":

        if draft is None:
            return "ไม่มีรายการรอยกเลิกค่ะ"

        with transaction.atomic():
            locked = (
                TransactionDraft.objects
                .select_for_update()
                .filter(
                    id=draft.id,
                    user=user,
                    status="pending"
                )
                .first()
            )

            if locked is None:
                clear_pending(line_user_id)
                return "รายการนี้ดำเนินการไปแล้วค่ะ"

            locked.status = "cancelled"
            locked.save(update_fields=["status"])

        clear_pending(line_user_id)
        return "ยกเลิกรายการแล้วค่ะ"

    # ยืนยันด้วยข้อความ
    if command == "ยืนยัน":

        if draft is None:
            return "ไม่มีรายการรอยืนยัน กรุณาส่งรายการใหม่"

        new_transaction, error = confirm_transaction_draft(
            draft_id=draft.id,
            user=user
        )

        if error:
            return error

        clear_pending(line_user_id)

        label = (
            "รายรับ"
            if new_transaction.transaction_type == "income"
            else "รายจ่าย"
        )

        return (
            f"บันทึกสำเร็จค่ะ (#{new_transaction.id})\n"
            f"{label} {new_transaction.amount:,.2f} บาท"
        )

    # อ่านโหมดจากฐานข้อมูล
    transaction_type = get_record_mode(user)

    if transaction_type not in ("income", "expense"):
        return (
            "กรุณากดจดรายรับหรือจดรายจ่าย"
            "จาก Rich Menu ก่อนค่ะ"
        )

    # Parser ใช้ประเภทจาก Rich Menu เท่านั้น
    result = parse_financial_message(
        command,
        transaction_type
    )

    if not result or not result.get("success"):
        return (
            "ไม่พบจำนวนเงินค่ะ "
            "ลองพิมพ์ เช่น ชา 80 บาท"
        )

    parsed_category = (
        result.get("category") or "อื่นๆ"
    )

    category = find_category(
        parsed_category,
        transaction_type
    )

    if category is None:
        return (
            "ไม่พบหมวดหมู่ในฐานข้อมูล "
            "กรุณาเพิ่มหมวดหมู่ 'อื่นๆ' ก่อน"
        )

    # ถ้ามี Draft เดิม ให้แก้ไข Draft เดิม
    if draft is not None:

        draft.amount = result.get("amount")
        draft.transaction_type = transaction_type
        draft.description = (
            result.get("description") or ""
        )
        draft.category = category
        draft.sub_category = (
            result.get("sub_category") or ""
        )
        draft.account = (
            result.get("account") or ""
        )

        draft.save()

    else:
        # สร้าง Draft ใหม่ ยังไม่บันทึก Transaction
        now = timezone.localtime()

        draft = TransactionDraft.objects.create(
            user=user,
            amount=result.get("amount"),
            transaction_type=transaction_type,
            description=result.get("description") or "",
            category=category,
            sub_category=result.get("sub_category") or "",
            account=result.get("account") or "",
            transaction_date=now.date(),
            transaction_time=now.time().replace(
                microsecond=0
            ),
            status="pending"
        )

    set_pending(line_user_id, draft)

    return show_pending(draft)


# ==================== Image Message / OCR ====================

def attach_receipt_to_draft(draft, image_bytes, message_id):
    """Upload a receipt to private Supabase Storage and save its object path."""
    path = upload_receipt(image_bytes, f"line_{message_id}.jpg")
    draft.receipt.name = path
    draft.save(update_fields=["receipt"])
    return draft

def handle_image_message(message_id, line_user_id):

    user = User.objects.filter(
        line_uid=line_user_id
    ).first()

    if user is None:
        return (
            "กรุณาเข้าสู่ระบบด้วย LINE "
            "เดียวกันก่อนส่งรูปค่ะ"
        )

    if not message_id:
        return "ไม่พบรหัสรูปภาพ กรุณาส่งรูปใหม่"

    transaction_type = get_record_mode(user)

    if transaction_type not in ("income", "expense"):
        return (
            "กรุณากดจดรายรับหรือจดรายจ่าย"
            "จาก Rich Menu ก่อนส่งรูปค่ะ"
        )

    # ดาวน์โหลดรูปจาก LINE
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
        return "รูปภาพใหญ่เกิน 5 MB กรุณาส่งรูปใหม่"

    draft = get_pending(line_user_id, user)

    # มีข้อความก่อน แล้วส่งรูปตามมา
    if draft is not None:
        if draft.transaction_type in ("income", "expense"):

            attach_receipt_to_draft(
                draft,
                image_bytes,
                message_id
            )

            return show_pending(draft)

    # ส่งรูปก่อน ใช้ OCR อ่านข้อมูล
    try:
        text = read_receipt(BytesIO(image_bytes))

        amount, amount_status = get_receipt_amount(
            text
        )

        date_time_text = extract_datetime(text)

    except Exception:
        logger.exception("OCR failed")

        amount = None
        amount_status = "not_found"
        date_time_text = None

    date_value, time_value = parse_date_time(
        date_time_text
    )

    if draft is None:

        draft = TransactionDraft.objects.create(
            user=user,
            amount=amount,
            transaction_type=transaction_type,
            category=find_category(
                "อื่นๆ",
                transaction_type
            ),
            description="",
            transaction_date=date_value,
            transaction_time=time_value,
            status="pending"
        )

    else:
        draft.amount = amount
        draft.transaction_type = transaction_type
        draft.category = find_category(
            "อื่นๆ",
            transaction_type
        )

        if date_value:
            draft.transaction_date = date_value

        if time_value:
            draft.transaction_time = time_value

        draft.save()

    # แนบรูปกับ Draft
    attach_receipt_to_draft(
        draft,
        image_bytes,
        message_id
    )

    set_pending(line_user_id, draft)

    # ถ้าอ่านยอดได้ แสดง Flex Card
    if amount is not None:
        return show_pending(draft)

    # ถ้าอ่านยอดไม่ได้ ให้ผู้ใช้พิมพ์ข้อมูลเพิ่ม
    return (
        "ได้รับรูปแล้วค่ะ แต่ OCR อ่านยอดไม่พบ\n"
        f"วันที่: {date_time_text or 'อ่านไม่พบ'}\n"
        "กรุณาส่งข้อความระบุรายการและจำนวนเงิน "
        "เช่น 'ค่าอาหาร 40 บาท'"
    )


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

            reply_to_line(
                event.get("replyToken"),
                answer
            )

        except Exception:
            logger.exception(
                "LINE event processing failed"
            )

            try:
                reply_to_line(
                    event.get("replyToken"),
                    "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้งค่ะ"
                )

            except Exception:
                logger.exception(
                    "LINE error reply failed"
                )

    return JsonResponse({"status": "ok"})
