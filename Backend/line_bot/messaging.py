import httpx
from django.conf import settings

from users.models import PersonalProfile
from urllib.parse import urlencode

from decimal import Decimal
from calendar import monthrange

from django.db import transaction
from django.db.models import Sum

from debts.models import Debts, Payments

def push_test_flex_message(line_user_id, message_type="debt"):
    """
    ส่ง Flex Message ตัวอย่างไปยัง LINE User ID ที่ระบุ เพื่อทดสอบหน้าตา

    เรียกใช้ผ่าน Django shell:
        from line_bot.messaging import push_test_flex_message
        push_test_flex_message("Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
        push_test_flex_message("Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", "reminder")

    message_type รองรับ:
        - "debt": การ์ดแจ้งเตือนรายการหนี้ใหม่
        - "reminder": การ์ดแจ้งเตือนชำระหนี้

    หมายเหตุ: ส่งข้อความจริงผ่าน LINE OA ไปยังผู้รับ
    """
    if not line_user_id or not isinstance(line_user_id, str):
        print("กรุณาระบุ LINE User ID ของผู้รับ")
        return False

    access_token = getattr(settings, "LINE_BOT_CHANNEL_ACCESS_TOKEN", None)
    if not access_token:
        print("ไม่พบ LINE_BOT_CHANNEL_ACCESS_TOKEN ใน Django settings")
        return False

    frontend_url = getattr(settings, "FRONTEND_URL", "").rstrip("/")
    if not frontend_url:
        print("ไม่พบ FRONTEND_URL ใน Django settings")
        return False

    if message_type == "debt":
        title = "มีรายการหนี้ใหม่แจ้งถึงคุณ"
        alt_text = "ทดสอบ Flex Message: แจ้งเตือนรายการหนี้ใหม่"
        details = [
            {
                "type": "text",
                "text": "รายการ: ค่าหนังสือเรียน",
                "size": "md",
                "color": "#30294A",
                "wrap": True,
                "margin": "md",
            },
            {
                "type": "text",
                "text": "ประเภท: หนี้สิน",
                "size": "sm",
                "color": "#777286",
                "wrap": True,
                "margin": "sm",
            },
            {
                "type": "text",
                "text": "จำนวนเงิน: 1,500.00 บาท",
                "size": "md",
                "weight": "bold",
                "color": "#6C4BC1",
                "wrap": True,
                "margin": "md",
            },
            {
                "type": "text",
                "text": "วันครบกำหนด: 30/11/2026",
                "size": "sm",
                "color": "#777286",
                "wrap": True,
                "margin": "sm",
            },
            {
                "type": "text",
                "text": "หมายเหตุ: ข้อความนี้เป็นข้อมูลตัวอย่างสำหรับทดสอบ",
                "size": "sm",
                "color": "#777286",
                "wrap": True,
                "margin": "md",
            },
        ]
        button_label = "ตรวจสอบ"
        button_url = f"{frontend_url}/debts/"

    elif message_type == "reminder":
        title = "แจ้งเตือนชำระหนี้"
        alt_text = "ทดสอบ Flex Message: แจ้งเตือนชำระหนี้"
        details = [
            {
                "type": "text",
                "text": "รายการ: ค่าหนังสือเรียน",
                "size": "md",
                "color": "#30294A",
                "wrap": True,
                "margin": "md",
            },
            {
                "type": "text",
                "text": "ยอดชำระต่องวด: 500.00 บาท",
                "size": "md",
                "weight": "bold",
                "color": "#6C4BC1",
                "wrap": True,
                "margin": "md",
            },
            {
                "type": "text",
                "text": "วันครบกำหนด: 30/11/2026",
                "size": "sm",
                "color": "#777286",
                "wrap": True,
                "margin": "sm",
            },
        ]
        button_label = "ชำระหนี้"
        query = urlencode({"debtId": "test"})
        button_url = f"{frontend_url}/debts/?{query}"

    else:
        print("message_type ต้องเป็น 'debt' หรือ 'reminder'")
        return False

    message = {
        "type": "flex",
        "altText": alt_text[:400],
        "contents": {
            "type": "bubble",
            "size": "kilo",
            "body": {
                "type": "box",
                "layout": "vertical",
                "spacing": "md",
                "paddingAll": "20px",
                "contents": [
                    {
                        "type": "text",
                        "text": title,
                        "weight": "bold",
                        "size": "lg",
                        "color": "#30294A",
                        "wrap": True,
                    },
                    {
                        "type": "separator",
                        "margin": "md",
                        "color": "#E8E5F0",
                    },
                    *details,
                    {
                        "type": "button",
                        "style": "primary",
                        "color": "#6C4BC1",
                        "height": "md",
                        "margin": "xl",
                        "action": {
                            "type": "uri",
                            "label": button_label,
                            "uri": button_url,
                        },
                    },
                ],
            },
        },
    }

    try:
        response = httpx.post(
            "https://api.line.me/v2/bot/message/push",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}",
            },
            json={
                "to": line_user_id,
                "messages": [message],
            },
            timeout=10,
        )

        print("LINE TEST FLEX STATUS:", response.status_code)
        print("LINE TEST FLEX RESPONSE:", response.text)
        response.raise_for_status()
        return True

    except httpx.HTTPError as error:
        print("ส่ง Test Flex Message ทาง LINE ไม่สำเร็จ:", error)
        return False


def push_friend_request(receiver, sender, friend_request):
    """
    ส่ง Flex Message แจ้งเตือนคำขอเป็นเพื่อนผ่าน LINE OA
    แสดงรูปโปรไฟล์ ชื่อผู้ส่ง และปุ่มยอมรับ/ปฏิเสธ
    """

    if not receiver.line_uid:
        print("ไม่สามารถแจ้งเตือนเพื่อนได้: ผู้รับไม่มี LINE User ID")
        return False

    url = "https://api.line.me/v2/bot/message/push"

    headers = {
        "Content-Type": "application/json",
        "Authorization": (
            f"Bearer {settings.LINE_BOT_CHANNEL_ACCESS_TOKEN}"
        ),
    }

    try:
        profile_url = sender.personal_profile.profile_img
    except PersonalProfile.DoesNotExist:
        profile_url = None

    if not profile_url:
        profile_url = "https://placehold.co/300x300/png"

    data = {
        "to": receiver.line_uid,
        "messages": [
            {
                "type": "flex",
                "altText": (
                    f"{sender.username} ต้องการเพิ่มคุณเป็นเพื่อน"
                )[:400],
                "contents": {
                    "type": "bubble",
                    "size": "kilo",
                    "body": {
                        "type": "box",
                        "layout": "vertical",
                        "alignItems": "center",
                        "spacing": "md",
                        "paddingAll": "20px",
                        "contents": [
                            {
                                "type": "text",
                                "text": "คำขอเป็นเพื่อน",
                                "weight": "bold",
                                "size": "lg",
                                "color": "#30294A",
                                "align": "center",
                                "wrap": True,
                            },
                            {
                                "type": "image",
                                "url": profile_url,
                                "size": "xl",
                                "aspectRatio": "1:1",
                                "aspectMode": "cover",
                                "align": "center",
                            },
                            {
                                "type": "text",
                                "text": str(sender.username)[:100],
                                "weight": "bold",
                                "size": "md",
                                "color": "#30294A",
                                "align": "center",
                                "wrap": True,
                            },
                            {
                                "type": "text",
                                "text": "ต้องการเพิ่มคุณเป็นเพื่อน",
                                "size": "sm",
                                "color": "#777286",
                                "align": "center",
                                "wrap": True,
                            },
                            {
                                "type": "box",
                                "layout": "horizontal",
                                "spacing": "md",
                                "margin": "lg",
                                "contents": [
                                    {
                                        "type": "button",
                                        "style": "primary",
                                        "color": "#22A447",
                                        "height": "md",
                                        "flex": 1,
                                        "action": {
                                            "type": "postback",
                                            "label": "ยอมรับ",
                                            "data": (
                                                "action=friend_accept"
                                                f"&friend_id={friend_request.id}"
                                            ),
                                            "displayText": (
                                                "ยอมรับคำขอเป็นเพื่อน"
                                            ),
                                        },
                                    },
                                    {
                                        "type": "button",
                                        "style": "secondary",
                                        "color": "#E8E8E8",
                                        "height": "md",
                                        "flex": 1,
                                        "action": {
                                            "type": "postback",
                                            "label": "ปฏิเสธ",
                                            "data": (
                                                "action=friend_reject"
                                                f"&friend_id={friend_request.id}"
                                            ),
                                            "displayText": (
                                                "ปฏิเสธคำขอเป็นเพื่อน"
                                            ),
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                },
            }
        ],
    }

    try:
        response = httpx.post(
            url,
            headers=headers,
            json=data,
            timeout=10,
        )

        print("LINE FRIEND REQUEST STATUS:", response.status_code)
        print("LINE FRIEND REQUEST RESPONSE:", response.text)

        response.raise_for_status()
        return True

    except httpx.HTTPError as error:
        print("ส่งคำขอเป็นเพื่อนทาง LINE ไม่สำเร็จ:", error)
        return False


def push_new_debt_notification(debt, target_debt=None):
    """
    ส่ง Flex Message แจ้งเตือนรายการหนี้ใหม่ทาง LINE OA

    debt:
        รายการที่ผู้สร้างบันทึกไว้

    target_debt:
        รายการคู่กันในบัญชีของผู้รับแจ้งเตือน
        ถ้าไม่ระบุ จะใช้ counterparty ของ debt แบบเดิม
    """
    # กำหนดผู้รับและรายการที่ต้องเปิด
    if target_debt is not None:
        receiver = target_debt.user
        detail_debt = target_debt
    else:
        receiver = debt.counterparty
        detail_debt = debt

    if not receiver:
        print("ข้ามการแจ้งเตือนหนี้: ไม่มีผู้รับ")
        return False

    if not receiver.line_uid:
        print("ข้ามการแจ้งเตือนหนี้: ผู้รับไม่มี LINE User ID")
        return False

    # URL ของ Frontend ให้กำหนดผ่าน Django settings
    frontend_url = getattr(settings, "FRONTEND_URL", "").rstrip("/")

    if not frontend_url:
        print("ไม่สามารถแจ้งเตือนหนี้: ยังไม่ได้ตั้งค่า FRONTEND_URL")
        return False

    detail_url = f"{frontend_url}/debts/?debtId={detail_debt.pk}"

    if detail_debt.type == "borrowed":
        debt_type_text = "หนี้สิน"
    elif detail_debt.type == "lent":
        debt_type_text = "รายการให้ยืม"
    else:
        debt_type_text = "รายการหนี้"

    due_date_text = (
        detail_debt.due_date.strftime("%d/%m/%Y")
        if detail_debt.due_date
        else "-"
    )

    note_text = detail_debt.note.strip() if detail_debt.note else ""

    contents = [
        {
            "type": "text",
            "text": "มีรายการหนี้ใหม่แจ้งถึงคุณ",
            "weight": "bold",
            "size": "lg",
            "color": "#30294A",
            "wrap": True,
        },
        {
            "type": "separator",
            "margin": "md",
            "color": "#E8E5F0",
        },
        {
            "type": "text",
            "text": f"รายการ: {detail_debt.name}"[:500],
            "size": "md",
            "color": "#30294A",
            "wrap": True,
            "margin": "md",
        },
        {
            "type": "text",
            "text": f"ประเภท: {debt_type_text}",
            "size": "sm",
            "color": "#777286",
            "wrap": True,
            "margin": "sm",
        },
        {
            "type": "text",
            "text": f"จำนวนเงิน: {detail_debt.total_amount:,.2f} บาท",
            "size": "md",
            "weight": "bold",
            "color": "#6C4BC1",
            "wrap": True,
            "margin": "md",
        },
        {
            "type": "text",
            "text": f"วันครบกำหนด: {due_date_text}",
            "size": "sm",
            "color": "#777286",
            "wrap": True,
            "margin": "sm",
        },
    ]

    if note_text:
        contents.append({
            "type": "text",
            "text": f"หมายเหตุ: {note_text}"[:1000],
            "size": "sm",
            "color": "#777286",
            "wrap": True,
            "margin": "md",
        })

    contents.append({
        "type": "button",
        "style": "primary",
        "color": "#6C4BC1",
        "height": "md",
        "margin": "xl",
        "action": {
            "type": "uri",
            "label": "ตรวจสอบ",
            "uri": detail_url,
        },
    })

    data = {
        "to": receiver.line_uid,
        "messages": [
            {
                "type": "flex",
                "altText": (
                    f"มีรายการหนี้ใหม่: {detail_debt.name}"
                )[:400],
                "contents": {
                    "type": "bubble",
                    "size": "kilo",
                    "body": {
                        "type": "box",
                        "layout": "vertical",
                        "spacing": "md",
                        "paddingAll": "20px",
                        "contents": contents,
                    },
                },
            }
        ],
    }

    url = "https://api.line.me/v2/bot/message/push"

    headers = {
        "Content-Type": "application/json",
        "Authorization": (
            f"Bearer {settings.LINE_BOT_CHANNEL_ACCESS_TOKEN}"
        ),
    }

    try:
        response = httpx.post(
            url,
            headers=headers,
            json=data,
            timeout=10,
        )

        print("LINE DEBT PUSH STATUS:", response.status_code)
        print("LINE DEBT PUSH RESPONSE:", response.text)

        response.raise_for_status()
        return True

    except httpx.HTTPError as error:
        print("ส่งแจ้งเตือนรายการหนี้ทาง LINE ไม่สำเร็จ:", error)
        return False

# ฟังก์ชันแจ้งเตือนชำระหนี้
def push_debt_payment_reminder(debt, due_date, pay_url):
    """
    ส่ง Flex Message เตือนชำระหนี้ผ่าน LINE OA

    debt: รายการหนี้ของลูกหนี้
    due_date: วันครบกำหนดของงวดที่กำลังแจ้ง
    pay_url: URL ที่เปิดหน้าชำระหนี้ของงวดนั้นโดยตรง
    """
    receiver = debt.user

    if not receiver.line_uid:
        print(
            f"ข้ามการแจ้งเตือนหนี้ {debt.pk}: "
            "ผู้ใช้ไม่มี LINE User ID"
        )
        return False

    frontend_url = getattr(settings, "FRONTEND_URL", "").rstrip("/")

    if not frontend_url:
        print("ส่งแจ้งเตือนไม่ได้: ไม่พบ FRONTEND_URL")
        return False

    query = urlencode({"debtId": debt.id})
    pay_url = f"{frontend_url}/debts/?{query}"

    if debt.payment_amount is not None:
        amount_text = (
            f"ยอดชำระต่องวด: {debt.payment_amount:,.2f} บาท"
        )
    else:
        amount_text = (
            f"ยอดหนี้คงเหลือ: {debt.remaining_amount:,.2f} บาท"
        )

    due_date_text = due_date.strftime("%d/%m/%Y")

    contents = [
        {
            "type": "text",
            "text": "แจ้งเตือนชำระหนี้",
            "weight": "bold",
            "size": "xl",
            "color": "#30294A",
            "wrap": True,
        },
        {
            "type": "separator",
            "margin": "md",
            "color": "#E8E5F0",
        },
        {
            "type": "text",
            "text": f"รายการ: {debt.name}"[:500],
            "size": "md",
            "color": "#30294A",
            "wrap": True,
            "margin": "md",
        },
        {
            "type": "text",
            "text": amount_text,
            "size": "md",
            "weight": "bold",
            "color": "#6C4BC1",
            "wrap": True,
            "margin": "md",
        },
        {
            "type": "text",
            "text": f"วันครบกำหนด: {due_date_text}",
            "size": "sm",
            "color": "#777286",
            "wrap": True,
            "margin": "sm",
        },
        {
            "type": "button",
            "style": "primary",
            "color": "#6C4BC1",
            "height": "md",
            "margin": "xl",
            "action": {
                "type": "uri",
                "label": "ชำระหนี้",
                "uri": pay_url,
            },
        },
    ]

    data = {
        "to": receiver.line_uid,
        "messages": [
            {
                "type": "flex",
                "altText": (
                    f"แจ้งเตือนชำระหนี้ {debt.name} "
                    f"ครบกำหนด {due_date_text}"
                )[:400],
                "contents": {
                    "type": "bubble",
                    "size": "kilo",
                    "body": {
                        "type": "box",
                        "layout": "vertical",
                        "spacing": "md",
                        "paddingAll": "20px",
                        "contents": contents,
                    },
                },
            }
        ],
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": (
            f"Bearer {settings.LINE_BOT_CHANNEL_ACCESS_TOKEN}"
        ),
    }

    try:
        response = httpx.post(
            "https://api.line.me/v2/bot/message/push",
            headers=headers,
            json=data,
            timeout=10,
        )

        print("LINE REMINDER STATUS:", response.status_code)
        print("LINE REMINDER RESPONSE:", response.text)

        response.raise_for_status()
        return True

    except httpx.HTTPError as error:
        print(
            f"ส่งแจ้งเตือนชำระหนี้ {debt.pk} ไม่สำเร็จ: {error}"
        )
        return False


def _push_debt_flex(
    receiver,
    title,
    details,
    button_label=None,
    button_url=None,
    alt_text="แจ้งเตือนเกี่ยวกับหนี้",
    image_url=None,
    button_actions=None,
):
    """ส่ง Flex Message แจ้งเตือนเกี่ยวกับการชำระหนี้"""

    if not receiver or not getattr(receiver, "line_uid", None):
        print("ข้ามการแจ้งเตือน: ไม่พบ LINE User ID ของผู้รับ")
        return False

    frontend_url = getattr(settings, "FRONTEND_URL", "").rstrip("/")
    if not frontend_url:
        print("ไม่สามารถแจ้งเตือนได้: ไม่พบ FRONTEND_URL")
        return False

    contents = [
        {
            "type": "text",
            "text": title[:500],
            "weight": "bold",
            "size": "lg",
            "color": "#30294A",
            "wrap": True,
        },
        {
            "type": "separator",
            "margin": "md",
            "color": "#E8E5F0",
        },
    ]

    for detail in details:
        contents.append({
            "type": "text",
            "text": str(detail)[:1000],
            "size": "md",
            "color": "#30294A",
            "wrap": True,
            "margin": "md",
        })

    # ถ้ามีปุ่มหลายปุ่ม
    if button_actions:
        buttons = []

        for button in button_actions:
            buttons.append({
                "type": "button",
                "style": button.get("style", "primary"),
                "color": button.get("color", "#6C4BC1"),
                "height": "md",
                "flex": 1,
                "action": button["action"],
            })

        contents.append({
            "type": "box",
            "layout": "horizontal",
            "spacing": "md",
            "margin": "xl",
            "contents": buttons,
        })

    # ปุ่มเดิมแบบปุ่มเดียว
    elif button_label and button_url:
        contents.append({
            "type": "button",
            "style": "primary",
            "color": "#6C4BC1",
            "height": "md",
            "margin": "xl",
            "action": {
                "type": "uri",
                "label": button_label[:20],
                "uri": button_url,
            },
        })

    bubble = {
        "type": "bubble",
        "size": "kilo",
        "body": {
            "type": "box",
            "layout": "vertical",
            "spacing": "md",
            "paddingAll": "20px",
            "contents": contents,
        },
    }

    # แสดงรูปหลักฐานไว้ด้านบนของการ์ด
    if image_url:
        bubble["body"]["contents"].insert(0, {
            "type": "box",
            "layout": "vertical",
            "paddingAll": "0px",
            "contents": [
                {
                    "type": "image",
                    "url": image_url,
                    "size": "full",
                    "aspectRatio": "9:16",
                    "aspectMode": "fit",
                    "action": {
                        "type": "uri",
                        "uri": image_url
                    }
                }
            ]
        })

    message = {
        "type": "flex",
        "altText": alt_text[:400],
        "contents": bubble,
    }

    access_token = getattr(
        settings,
        "LINE_BOT_CHANNEL_ACCESS_TOKEN",
        None,
    )

    if not access_token:
        print("ไม่พบ LINE_BOT_CHANNEL_ACCESS_TOKEN")
        return False

    try:
        response = httpx.post(
            "https://api.line.me/v2/bot/message/push",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}",
            },
            json={
                "to": receiver.line_uid,
                "messages": [message],
            },
            timeout=10,
        )

        print("LINE PAYMENT NOTIFICATION STATUS:", response.status_code)
        print("LINE PAYMENT NOTIFICATION RESPONSE:", response.text)

        response.raise_for_status()
        return True

    except httpx.HTTPError as error:
        print(f"ส่ง LINE Payment Notification ไม่สำเร็จ: {error}")
        return False


def _payment_history_url(debt):
    """สร้าง URL สำหรับเปิดประวัติการชำระของรายการหนี้"""
    frontend_url = getattr(settings, "FRONTEND_URL", "").rstrip("/")
    query = urlencode({
        "debtId": debt.pk,
        "view": "payment_history",
    })
    return f"{frontend_url}/debts/?{query}"


def _paid_debts_url(debt):
    """สร้าง URL สำหรับเปิดแท็บชำระครบแล้ว"""
    frontend_url = getattr(settings, "FRONTEND_URL", "").rstrip("/")
    query = urlencode({
        "tab": "paid",
        "debtId": debt.pk,
    })
    return f"{frontend_url}/debts/?{query}"


def push_payment_submitted_notification(payment):
    """
    แจ้งเจ้าหนี้เมื่อบัญชีลูกหนี้ที่ผูกกันส่งรายการชำระ
    พร้อมปุ่มอนุมัติและตรวจสอบประวัติการชำระ
    """

    debt = payment.debt

    # แจ้งเฉพาะการส่งรายการจากฝั่งลูกหนี้
    if debt.type != "borrowed" or not debt.paired_debt_id:
        return False

    creditor_debt = debt.paired_debt

    if not creditor_debt or creditor_debt.type != "lent":
        return False

    debtor = debt.user
    creditor = creditor_debt.user

    paid_date = (
        payment.paid_date.strftime("%d/%m/%Y")
        if payment.paid_date else "-"
    )

    # รูปหลักฐานจาก Supabase Storage
    proof_image_url = (
        str(payment.proof_image).strip()
        if payment.proof_image else None
    )

    return _push_debt_flex(
        receiver=creditor,
        title="คุณได้รับการชำระหนี้",
        details=[
            f"ชื่อหนี้สิน: {debt.name}",
            f"จากบัญชีลูกหนี้: {debtor.username or str(debtor)}",
            f"จำนวน: {payment.paid_amount:,.2f} บาท",
            f"วันที่: {paid_date}",
        ],
        image_url=proof_image_url,
        button_actions=[
            {
                "style": "primary",
                "color": "#22A447",
                "action": {
                    "type": "postback",
                    "label": "อนุมัติ",
                    "data": (
                        f"action=payment_approve"
                        f"&payment_id={payment.pk}"
                    ),
                    "displayText": "อนุมัติรายการชำระเงิน",
                },
            },
            {
                "style": "secondary",
                "color": "#E8E5F0",
                "action": {
                    "type": "uri",
                    "label": "ตรวจสอบ",
                    "uri": _payment_history_url(creditor_debt),
                },
            },
        ],
        alt_text=f"ได้รับการชำระหนี้ {debt.name}",
    )

def _get_next_monthly_due_date(current_due_date, payment_day):
    """เลื่อนวันครบกำหนดไปเดือนถัดไป โดยรักษาวันชำระเดิม"""

    if current_due_date.month == 12:
        year = current_due_date.year + 1
        month = 1
    else:
        year = current_due_date.year
        month = current_due_date.month + 1

    last_day = monthrange(year, month)[1]

    return current_due_date.replace(
        year=year,
        month=month,
        day=min(payment_day, last_day),
    )


def _recalculate_linked_debt_remaining(debt):
    """คำนวณยอดหนี้คงเหลือของหนี้ทั้งสองฝั่ง"""

    related_debts = [debt]

    if debt.paired_debt_id:
        paired_debt = Debts.objects.filter(
            pk=debt.paired_debt_id
        ).first()

        if paired_debt:
            related_debts.append(paired_debt)

    related_ids = [item.pk for item in related_debts]

    approved_total = (
        Payments.objects.filter(
            debt_id__in=related_ids,
            approvement_status="approved",
        ).aggregate(total=Sum("paid_amount"))["total"]
        or Decimal("0.00")
    )

    has_pending_payment = Payments.objects.filter(
        debt_id__in=related_ids,
        approvement_status="pending",
    ).exists()

    for related_debt in related_debts:
        remaining = max(
            Decimal("0.00"),
            Decimal(related_debt.total_amount) - approved_total,
        )

        related_debt.remaining_amount = remaining
        related_debt.status = (
            "paid"
            if remaining == Decimal("0.00") and not has_pending_payment
            else "ongoing"
        )

        related_debt.save(
            update_fields=[
                "remaining_amount",
                "status",
                "updated_at",
            ]
        )

    return related_debts


@transaction.atomic
def approve_payment_from_line(payment_id, creditor):
    """
    อนุมัติรายการชำระหนี้จาก LINE OA
    อนุญาตเฉพาะเจ้าหนี้ของรายการที่ผูกบัญชีเพื่อนเท่านั้น
    """

    payment = (
        Payments.objects
        .select_for_update()
        .filter(pk=payment_id)
        .first()
    )

    if payment is None:
        return "ไม่พบรายการชำระเงินนี้ค่ะ"

    debt = payment.debt

    # ตรวจสอบสิทธิ์เจ้าหนี้
    is_creditor = (
        debt.type == "borrowed"
        and debt.paired_debt_id is not None
        and debt.counterparty_id == creditor.pk
        and debt.paired_debt is not None
        and debt.paired_debt.type == "lent"
        and debt.paired_debt.user_id == creditor.pk
    )

    if not is_creditor:
        return "คุณไม่มีสิทธิ์อนุมัติรายการชำระเงินนี้ค่ะ"

    # ป้องกันการกดอนุมัติซ้ำ
    if payment.approvement_status != "pending":
        if payment.approvement_status == "approved":
            return "รายการนี้ได้รับการอนุมัติไปแล้วค่ะ"

        return "รายการนี้ไม่อยู่ในสถานะรออนุมัติค่ะ"

    # คำนวณยอดล่าสุดก่อนอนุมัติ
    related_debts = _recalculate_linked_debt_remaining(debt)
    debt.refresh_from_db()

    related_debt_ids = [item.pk for item in related_debts]

    # อนุมัติรายการ
    old_approvement_status = payment.approvement_status

    payment.approvement_status = "approved"
    if payment.paid_amount <= 0:
        payment.payment_status = "pending"
    elif (
        payment.scheduled_amount is not None
        and payment.paid_amount < payment.scheduled_amount
    ):
        payment.payment_status = "partial"
    else:
        payment.payment_status = "paid"

    payment.save(
        update_fields=[
            "approvement_status",
            "payment_status",
            "updated_at",
        ]
    )

    # คำนวณยอดคงเหลือใหม่หลังอนุมัติ
    related_debts = _recalculate_linked_debt_remaining(debt)
    debt.refresh_from_db()

    # จัดการวันครบกำหนดสำหรับหนี้รายเดือน
    if (
        debt.payment_type == "monthly"
        and debt.payment_amount is not None
        and payment.due_date is not None
    ):
        installment_paid_total = (
            Payments.objects.filter(
                debt_id__in=related_debt_ids,
                due_date=payment.due_date,
                approvement_status="approved",
            ).aggregate(total=Sum("paid_amount"))["total"]
            or Decimal("0.00")
        )

        installment_target = min(
            Decimal(debt.payment_amount),
            Decimal(debt.remaining_amount) + Decimal(payment.paid_amount),
        )

        if (
            installment_target > Decimal("0.00")
            and installment_paid_total >= installment_target
            and debt.remaining_amount > Decimal("0.00")
        ):
            next_due_date = _get_next_monthly_due_date(
                payment.due_date,
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

    # ส่งการแจ้งเตือนหลัง transaction สำเร็จ
    def send_approval_notification():
        payment.refresh_from_db()
        debt.refresh_from_db()

        if debt.remaining_amount == Decimal("0.00"):
            related_ids = [debt.pk, debt.paired_debt_id]

            has_unapproved_payment = Payments.objects.filter(
                debt_id__in=related_ids
            ).exclude(
                approvement_status="approved"
            ).exists()

            if not has_unapproved_payment:
                push_debt_fully_paid_notification(debt)
                return

        push_payment_confirmation_notification(
            payment,
            "approved",
        )

    transaction.on_commit(send_approval_notification)

    return (
        f"อนุมัติและบันทึกสถานะการชำระเงิน {debt.name} "
        f"จำนวน {payment.paid_amount:,.2f} บาท เรียบร้อยแล้วค่ะ"
    )


def push_payment_confirmation_notification(payment, approvement_status):
    """
    แจ้งลูกหนี้เมื่อเจ้าหนี้ยืนยันหรือปฏิเสธรายการชำระ
    """
    debt = payment.debt

    # หา debt ฝั่งลูกหนี้ เพื่อระบุผู้รับและลิงก์ให้ถูกบัญชี
    if debt.type == "borrowed":
        debtor_debt = debt
    elif debt.paired_debt_id:
        debtor_debt = debt.paired_debt
    else:
        return False

    if debtor_debt.type != "borrowed":
        return False

    if approvement_status == "approved":
        status_text = "ได้รับการยืนยันแล้ว"
        title = "เจ้าหนี้ยืนยันการชำระเงินแล้ว"
    else:
        return False

    # เลขงวดเรียงให้ตรงกับหน้าประวัติการชำระ:
    # รายการล่าสุดอยู่ด้านบน และเลขงวดคำนวณจากจำนวนรายการทั้งหมด
    from debts.models import Payments

    related_ids = [debtor_debt.pk]
    if debtor_debt.paired_debt_id:
        related_ids.append(debtor_debt.paired_debt_id)

    ordered_payments = list(
        Payments.objects.filter(
            debt_id__in=related_ids
        ).order_by("-paid_date", "-created_at")
    )

    installment_number = next(
        (
            len(ordered_payments) - index
            for index, item in enumerate(ordered_payments)
            if item.pk == payment.pk
        ),
        None,
    )

    paid_date = (
        payment.paid_date.strftime("%d/%m/%Y")
        if payment.paid_date else "-"
    )

    installment_text = (
        f"งวดที่: {installment_number}"
        if installment_number is not None
        else "งวดที่: -"
    )

    return _push_debt_flex(
        receiver=debtor_debt.user,
        title=title,
        details=[
            f"ชื่อหนี้สิน: {debtor_debt.name}",
            installment_text,
            f"วันที่ชำระ: {paid_date}",
            f"สถานะ: {status_text}",
            f"จำนวน: {payment.paid_amount:,.2f} บาท",
        ],
        button_label="ตรวจสอบ",
        button_url=_payment_history_url(debtor_debt),
        alt_text=f"{debtor_debt.name}: {status_text}",
    )


def push_debt_fully_paid_notification(debt):
    """
    แจ้งเมื่อหนี้ที่ผูกบัญชีเพื่อนชำระครบแล้ว
    ส่งข้อความแยกให้เจ้าหนี้และลูกหนี้
    """
    if not debt.paired_debt_id:
        return False

    paired_debt = debt.paired_debt
    if not paired_debt or paired_debt.paired_debt_id != debt.pk:
        return False

    if debt.remaining_amount > 0 or paired_debt.remaining_amount > 0:
        return False

    if debt.type == "borrowed":
        debtor_debt = debt
        creditor_debt = paired_debt
    elif debt.type == "lent":
        creditor_debt = debt
        debtor_debt = paired_debt
    else:
        return False

    if debtor_debt.type != "borrowed" or creditor_debt.type != "lent":
        return False

    debtor_name = debtor_debt.user.username or str(debtor_debt.user)
    creditor_name = (
        creditor_debt.user.username or str(creditor_debt.user)
    )

    creditor_sent = _push_debt_flex(
        receiver=creditor_debt.user,
        title="ยินดีด้วย! คุณได้รับชำระหนี้ครบแล้ว",
        details=[
            f"คุณได้รับชำระหนี้สิน {creditor_debt.name} "
            f"จาก {debtor_name} ครบตามจำนวนยอดทั้งหมดแล้ว"
        ],
        button_label="ตรวจสอบ",
        button_url=_paid_debts_url(creditor_debt),
        alt_text=f"ได้รับชำระหนี้ {creditor_debt.name} ครบแล้ว",
    )

    debtor_sent = _push_debt_flex(
        receiver=debtor_debt.user,
        title="ยินดีด้วย! คุณชำระหนี้ครบแล้ว",
        details=[
            f"คุณชำระหนี้สิน {debtor_debt.name} "
            f"ให้ {creditor_name} ครบตามจำนวนยอดทั้งหมดแล้ว"
        ],
        button_label="ตรวจสอบ",
        button_url=_paid_debts_url(debtor_debt),
        alt_text=f"ชำระหนี้ {debtor_debt.name} ครบแล้ว",
    )

    return creditor_sent and debtor_sent


def push_manual_debt_fully_paid_notification(debt):
    """
    แจ้งเจ้าของบัญชีเมื่อรายการที่บันทึกเองชำระครบ
    """
    if debt.paired_debt_id or debt.counterparty_id:
        return False

    if debt.remaining_amount > 0:
        return False

    if debt.type == "borrowed":
        title = "ยินดีด้วย! คุณชำระหนี้ครบแล้ว"
        detail = (
            f"คุณชำระหนี้สิน {debt.name} "
            "ครบตามจำนวนยอดทั้งหมดแล้ว"
        )
    elif debt.type == "lent":
        title = "ยินดีด้วย! คุณได้รับเงินคืนครบแล้ว"
        detail = (
            f"คุณได้รับเงินคืนจากรายการ {debt.name} "
            "ครบตามจำนวนยอดทั้งหมดแล้ว"
        )
    else:
        return False

    return _push_debt_flex(
        receiver=debt.user,
        title=title,
        details=[detail],
        button_label="ตรวจสอบ",
        button_url=_paid_debts_url(debt),
        alt_text=f"{debt.name} ชำระครบแล้ว",
    )
