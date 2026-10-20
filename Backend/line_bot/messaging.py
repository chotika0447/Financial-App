import httpx
from django.conf import settings
from users.models import PersonalProfile

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

    # ส่งผู้รับไปยัง ID รายการในบัญชีของตัวเอง
    detail_url = f"{frontend_url}/debts/"

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
