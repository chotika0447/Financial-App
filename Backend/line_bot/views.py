
"""LINE OA: บันทึกด้วยข้อความ รูปสลิป และข้อความพร้อมรูปหลักฐาน"""

import base64
import hashlib
import hmac
import json
import logging

from datetime import datetime
from io import BytesIO
from urllib.parse import parse_qs, urlencode

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
from transactions.models import Transaction, TransactionDraft
from transactions.services import confirm_transaction_draft
from transactions.ocr import (
    read_receipt,
    get_receipt_amount,
    extract_datetime,
)
from users.models import User
from friends.models import Friends


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

def build_transaction_flex(item):
    """การ์ดแจ้งว่าบันทึกรายการแล้ว พร้อมลิงก์แก้ไข"""
    type_label = "รายรับ" if item.transaction_type == "income" else "รายจ่าย"
    category_text = item.category.name if item.category else "ไม่ระบุ"
    if item.sub_category:
        category_text += f" / {item.sub_category}"

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
                    detail(f"รายการ: {item.description or 'ไม่ระบุ'}"),
                    detail(f"หมวดหมู่: {category_text}"),
                    detail(f"ช่องทาง: {item.account or 'ไม่ระบุ'}"),
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


def show_pending(draft):
    """ยังอ่านยอดไม่ได้ จึงขอข้อความเพิ่มก่อนบันทึก"""
    return "ได้รับรูปแล้วค่ะ แต่ยังอ่านยอดเงินไม่ได้ กรุณาพิมพ์รายการและจำนวนเงิน เช่น กาแฟ 80 บาท"


def save_draft_now(draft, user, line_user_id):
    """แปลงรายการร่างเป็นรายการจริง แล้วส่งการ์ดแก้ไข"""
    item, error = confirm_transaction_draft(draft.id, user)
    if error:
        return error
    clear_pending(line_user_id)
    remember_recent_transaction(line_user_id, item)
    return build_transaction_flex(item)


def recent_transaction_key(line_user_id):
    return f"line_recent_transaction:{line_user_id}"


def remember_recent_transaction(line_user_id, item):
    # รองรับการส่งข้อความก่อน แล้วแนบรูปตามมาใน 5 นาที
    cache.set(recent_transaction_key(line_user_id), item.id, timeout=300)


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
        return "รายการรูปแบบเดิม กรุณาเปิดหน้าเว็บไซต์เพื่อจัดการรายการค่ะ"

    # ปุ่มเลือกโหมดจาก Rich Menu
    if action != "select_record":
        return "เมนูนี้ยังไม่เปิดใช้งานค่ะ"

    if record_type not in ("income", "expense"):
        return "เมนูจดหนี้สิน/การออมยังไม่เปิดใช้งานค่ะ"

    previous = LineRecordMode.objects.filter(
        user=user
    ).first()

    # เปลี่ยนโหมดแล้วล้างรายการร่างที่รอข้อมูลเพิ่ม
    if previous and previous.transaction_type != record_type:
        draft = get_pending(line_user_id, user)
        if draft is not None:
            draft.status = "cancelled"
            draft.save(update_fields=["status"])
            clear_pending(line_user_id)
        cache.delete(recent_transaction_key(line_user_id))

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

    # ไม่ใช้คำสั่งยืนยัน/ยกเลิกสำหรับรายการที่บันทึกแล้ว
    if command in ("ยืนยัน", "ยกเลิก"):
        return "ระบบบันทึกรายการอัตโนมัติแล้วค่ะ กดแก้ไขจากการ์ดรายการได้เลย"

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

    # ถ้ารูปก่อนหน้าอ่านยอดไม่ได้ ให้นำข้อมูลข้อความมาเติม
    if draft is not None:
        draft.amount = result["amount"]
        draft.transaction_type = transaction_type
        draft.description = result.get("description") or ""
        draft.category = category
        draft.sub_category = result.get("sub_category") or ""
        draft.account = result.get("account") or ""
        if not draft.transaction_date:
            draft.transaction_date = timezone.localdate()
        draft.save()
    else:
        now = timezone.localtime()
        draft = TransactionDraft.objects.create(
            user=user,
            amount=result["amount"],
            transaction_type=transaction_type,
            description=result.get("description") or "",
            category=category,
            sub_category=result.get("sub_category") or "",
            account=result.get("account") or "",
            transaction_date=now.date(),
            transaction_time=now.time().replace(microsecond=0),
        )

    return save_draft_now(draft, user, line_user_id)


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

    # ผู้ใช้ส่งข้อความแล้วตามด้วยรูป: แนบกับรายการล่าสุด ไม่สร้างรายการซ้ำ
    if draft is None:
        recent_id = cache.get(recent_transaction_key(line_user_id))
        recent_item = Transaction.objects.filter(id=recent_id, user=user).first() if recent_id else None
        if recent_item is not None:
            path = upload_receipt(image_bytes, f"line_{message_id}.jpg")
            recent_item.receipt.name = path
            recent_item.save(update_fields=["receipt"])
            cache.delete(recent_transaction_key(line_user_id))
            return build_transaction_flex(recent_item)

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
        now = timezone.localtime()
        draft = TransactionDraft.objects.create(
            user=user,
            amount=amount,
            transaction_type=transaction_type,
            category=find_category("อื่นๆ", transaction_type),
            description="",
            transaction_date=date_value or now.date(),
            transaction_time=time_value or now.time().replace(microsecond=0),
        )
    else:
        draft.amount = amount
        draft.transaction_type = transaction_type
        draft.category = find_category("อื่นๆ", transaction_type)
        if date_value:
            draft.transaction_date = date_value
        if time_value:
            draft.transaction_time = time_value
        draft.save()

    attach_receipt_to_draft(draft, image_bytes, message_id)

    if amount is not None and amount > 0:
        return save_draft_now(draft, user, line_user_id)

    set_pending(line_user_id, draft)
    return show_pending(draft)


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
        if event_key and not cache.add(event_key, True, timeout=86400):
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
            if event_key:
                cache.delete(event_key)
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
