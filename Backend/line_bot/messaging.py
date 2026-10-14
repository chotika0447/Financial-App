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
