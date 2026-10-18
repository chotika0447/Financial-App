import httpx
from django.conf import settings


def push_friend_request(receiver, sender, friend_request):
    """
    ส่งข้อความแจ้งเตือนคำขอเป็นเพื่อนไปยัง LINE ของผู้รับ
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

    data = {
        "to": receiver.line_uid,
        "messages": [
            {
                "type": "template",
                "altText": "มีคำขอเพิ่มเพื่อนใหม่",
                "template": {
                    "type": "buttons",
                    "title": "คำขอเป็นเพื่อน",
                    "text": (
                        f"{sender.username} ต้องการเพิ่มคุณเป็นเพื่อน"
                    )[:160],
                    "actions": [
                        {
                            "type": "postback",
                            "label": "ยอมรับ",
                            "data": (
                                f"action=friend_accept"
                                f"&friend_id={friend_request.id}"
                            ),
                            "displayText": "ยอมรับคำขอเป็นเพื่อน",
                        },
                        {
                            "type": "postback",
                            "label": "ปฏิเสธ",
                            "data": (
                                f"action=friend_reject"
                                f"&friend_id={friend_request.id}"
                            ),
                            "displayText": "ปฏิเสธคำขอเป็นเพื่อน",
                        },
                    ],
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

        print("LINE PUSH STATUS:", response.status_code)
        print("LINE PUSH RESPONSE:", response.text)

        response.raise_for_status()
        return True

    except httpx.HTTPError as error:
        print("ส่งคำขอเป็นเพื่อนทาง LINE ไม่สำเร็จ:", error)
        return False


def push_new_debt_notification(debt):
    """
    แจ้งเตือนผู้เกี่ยวข้องทาง LINE เมื่อมีการสร้างรายการหนี้ใหม่
    """

    counterparty = debt.counterparty

    if not counterparty:
        print("ข้ามการแจ้งเตือนหนี้: ไม่มีผู้ใช้คู่กรณี")
        return False

    if not counterparty.line_uid:
        print("ข้ามการแจ้งเตือนหนี้: คู่กรณีไม่มี LINE User ID")
        return False

    url = "https://api.line.me/v2/bot/message/push"

    headers = {
        "Content-Type": "application/json",
        "Authorization": (
            f"Bearer {settings.LINE_BOT_CHANNEL_ACCESS_TOKEN}"
        ),
    }

    if debt.type == "borrowed":
        debt_type_text = "หนี้สิน"
    elif debt.type == "lent":
        debt_type_text = "รายการให้ยืม"
    else:
        debt_type_text = "รายการหนี้"

    message_lines = [
        "🔔 มีรายการหนี้ใหม่แจ้งถึงคุณ",
        "",
        f"รายการ: {debt.name}",
        f"ประเภท: {debt_type_text}",
        f"จำนวนเงิน: {debt.total_amount:,.2f} บาท",
    ]

    if debt.due_date:
        message_lines.append(
            f"วันครบกำหนด: {debt.due_date.strftime('%d/%m/%Y')}"
        )

    if debt.note:
        message_lines.append(f"หมายเหตุ: {debt.note}")

    message_lines.extend([
        "",
        "กรุณาเปิด Financial App เพื่อตรวจสอบรายละเอียด",
    ])

    data = {
        "to": counterparty.line_uid,
        "messages": [
            {
                "type": "text",
                "text": "\n".join(message_lines)[:5000],
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

        print("LINE DEBT PUSH STATUS:", response.status_code)
        print("LINE DEBT PUSH RESPONSE:", response.text)

        response.raise_for_status()
        return True

    except httpx.HTTPError as error:
        print("ส่งแจ้งเตือนรายการหนี้ทาง LINE ไม่สำเร็จ:", error)
        return False
