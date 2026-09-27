import json
import hmac #ใช้ตรวจสอบความถูกต้องของ Webhook
import hashlib #ใช้เลือก algorithm สำหรับการสร้าง hash
import base64 #หลังจากสร้าง hash แล้วจะแปลงเป็น Base64:
import requests

from django.conf import settings #เอาไว้เข้าถึงค่าที่เราตั้งไว้ใน settings.py เช่น LINE_CHANNEL_ACCESS_TOKEN และ LINE_CHANNEL_SECRET
from django.http import JsonResponse #เอาไว้ให้ Django ส่ง response กลับไปเป็น JSON + HTTP status เพื่อให้ LINE รู้ว่าเราได้รับข้อความแล้ว
from django.views.decorators.csrf import csrf_exempt 

from .parser import parse_financial_message
from users.models import User, PersonalProfile

def reply_to_line(reply_token, message_text):
    # LINE Messaging API
    url = "https://api.line.me/v2/bot/message/reply"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.LINE_CHANNEL_ACCESS_TOKEN}",
    }

    data = {
        "replyToken": reply_token,
        "messages": [
            {
                "type": "text",
                "text": message_text,
            }
        ],
    }
    #Django ส่ง HTTP POST ไปที่ LINE Reply API เพื่อให้ LINE ส่งข้อความกลับไปยังผู้ใช้
    response = requests.post(
        url,
        headers=headers,
        json=data
    )

    print("LINE Reply Status:", response.status_code)
    print("LINE Reply Response:", response.text)


def get_line_profile(line_user_id):
    url = f"https://api.line.me/v2/bot/profile/{line_user_id}"

    headers = {
        "Authorization": f"Bearer {settings.LINE_CHANNEL_ACCESS_TOKEN}"
    }

    response = requests.get(
        url,
        headers=headers
    )

    print("LINE Profile Status:", response.status_code)
    print("LINE Profile Response:", response.text)

    if response.status_code == 200:
        return response.json()

    return None

"""
ยกเว้น CSRF protection ของdjango สำหรับ webhook ของ LINE 
เพราะLINE เป็น external service ที่ยิง request เข้ามา และไม่ได้ส่ง Django CSRF token
"""
@csrf_exempt
def line_webhook(request):

    if request.method != "POST":
        return JsonResponse(
            {"message": "LINE Webhook is working"},
            status=200
        )

    #เอา Body และ Signature(จาก HTTP Header)เพื่อเอาไปตรวจสอบความถูกต้องของ Webhook
    body = request.body
    signature = request.headers.get("X-Line-Signature")

    #ถ้าไม่มี Signature จะไม่รับ request นี้ เพราะไม่สามารถตรวจสอบความถูกต้องได้
    if not signature:
        return JsonResponse(
            {"error": "Missing X-Line-Signature"},
            status=400
        )

    #เอา Channel Secret + ข้อมูลที่ LINE ส่งมา ไปสร้าง HMAC-SHA256 เพื่อเอา hash มาเปรียบเทียบกับ Signature ที่ LINE ส่งมา
    hash_value = hmac.new(
        settings.LINE_CHANNEL_SECRET.encode("utf-8"),
        body,
        hashlib.sha256 #ใช้ SHA256 ในการสร้าง hash
    ).digest()

    expected_signature = base64.b64encode(hash_value).decode("utf-8")

    #ใช้ hmac.compare_digest() เพื่อเปรียบเทียบ Signature ที่ LINE ส่งมา กับ Signature ที่เราสร้างขึ้นเอง
    if not hmac.compare_digest(signature, expected_signature):
        return JsonResponse(
            {"error": "Invalid signature"},
            status=400
        )

    data = json.loads(body)

    print("LINE WEBHOOK:")
    print(json.dumps(data, indent=2, ensure_ascii=False))

    #ดึงรายการ Event ออกมาโดยยใช้ []list เพราะ LINE Webhook สามารถส่งหลาย events มาใน request เดียวได้
    events = data.get("events", [])

    #วนตรวจทุก Event ที่ LINE ส่งมา
    for event in events:

        if event.get("type") == "message":

            message = event.get("message", {})

            #กรองเฉพาะข้อความที่เป็น type "text" เท่านั้น
            if message.get("type") == "text":

                text = message.get("text")
                reply_token = event.get("replyToken")
                #replyTokenคือสิทธิ์สำหรับตอบกลับข้อความนี้ที่ LINE ส่งมาให้ แล้วต้องเอา token นี้ไปให้ LINE Reply API ตอบกลับผู้ใช้
                result = parse_financial_message(text)#ส่งข้อความเข้า Parser

                line_user_id = event.get("source", {}).get("userId")
                line_profile = get_line_profile(line_user_id)
                if line_profile:
                    print("LINE USER ID:", line_profile.get("userId"))
                    print("LINE NAME:", line_profile.get("displayName"))
                    print("LINE PICTURE:", line_profile.get("pictureUrl"))
                    print("ข้อความจาก LINE:", text)

                
                #ถ้ามีresult แสดงว่าข้อความนี้สามารถแยกประเภทและจำนวนเงินได้
                if result and result.get("success"):

                    reply_message = (
                        f"ตรวจพบรายการค่ะ\n"
                        f"ประเภท: {'รายรับ' if result['type'] == 'income' else 'รายจ่าย'}\n"
                        f"จำนวน: {result['amount']:,.2f} บาท\n"
                        f"หมวดหมู่: {result['category']}\n"
                        f"รายละเอียด: {result['description']}"
                    )

                else:

                    reply_message = (
                        "ขอโทษค่ะ ยังไม่เข้าใจรายการนี้ 😅\n"
                        "ลองพิมพ์ เช่น\n"
                        "กินข้าว 60 บาท"
                    )

                reply_to_line(reply_token, reply_message)

    return JsonResponse({"status": "ok"}, status=200)