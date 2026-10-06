import json
import hmac
import hashlib
import base64
import traceback
import httpx


from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone


from .parser import parse_financial_message
from transactions.models import Transaction
from categories.models import Category
from users.models import User


# ==========================================
# ตอบข้อความกลับ LINE
# ==========================================

def reply_to_line(reply_token, message_text):

    url = "https://api.line.me/v2/bot/message/reply"

    headers = {
        "Content-Type": "application/json",
        "Authorization": (
            f"Bearer {settings.LINE_BOT_CHANNEL_ACCESS_TOKEN}"
        ),
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

    response = httpx.post(
        url,
        headers=headers,
        json=data,
        timeout=10,
    )

    print(
        "LINE REPLY STATUS:",
        response.status_code
    )

    print(
        "LINE REPLY RESPONSE:",
        response.text
    )

    return response


# ==========================================
# LINE Webhook
# ==========================================

@csrf_exempt
def line_webhook(request):

    print(
        "\n========== LINE WEBHOOK START =========="
    )

    try:

        # ------------------------------------------
        # เปิด URL ผ่าน browser
        # ------------------------------------------

        if request.method != "POST":

            return JsonResponse(
                {
                    "message":
                    "LINE Webhook is working"
                },
                status=200,
            )


        # ------------------------------------------
        # ตรวจ LINE credentials
        # ------------------------------------------

        if not settings.LINE_BOT_CHANNEL_SECRET:

            print(
                "ERROR: LINE_BOT_CHANNEL_SECRET ไม่มีค่า"
            )

            return JsonResponse(
                {
                    "error":
                    "LINE channel secret not configured"
                },
                status=503,
            )


        if not settings.LINE_BOT_CHANNEL_ACCESS_TOKEN:

            print(
                "ERROR: LINE_BOT_CHANNEL_ACCESS_TOKEN ไม่มีค่า"
            )

            return JsonResponse(
                {
                    "error":
                    "LINE access token not configured"
                },
                status=503,
            )


        # ------------------------------------------
        # Signature
        # ------------------------------------------

        body = request.body

        signature = request.headers.get(
            "X-Line-Signature"
        )

        print(
            "STEP 1: CHECK SIGNATURE"
        )


        if not signature:

            print(
                "ERROR: Missing X-Line-Signature"
            )

            return JsonResponse(
                {
                    "error":
                    "Missing X-Line-Signature"
                },
                status=400,
            )


        hash_value = hmac.new(
            settings.LINE_BOT_CHANNEL_SECRET.encode(
                "utf-8"
            ),
            body,
            hashlib.sha256,
        ).digest()


        expected_signature = base64.b64encode(
            hash_value
        ).decode(
            "utf-8"
        )


        if not hmac.compare_digest(
            signature,
            expected_signature,
        ):

            print(
                "SIGNATURE NOT MATCH"
            )

            return JsonResponse(
                {
                    "error":
                    "Invalid signature"
                },
                status=400,
            )


        print(
            "SIGNATURE MATCH"
        )


        # ------------------------------------------
        # JSON
        # ------------------------------------------

        print(
            "STEP 2: READ JSON"
        )

        data = json.loads(
            body.decode(
                "utf-8"
            )
        )


        print(
            json.dumps(
                data,
                indent=2,
                ensure_ascii=False,
            )
        )


        events = data.get(
            "events",
            []
        )


        print(
            "EVENT COUNT:",
            len(events)
        )


        # LINE Verify อาจไม่มี event
        if not events:

            print(
                "NO EVENT - VERIFY REQUEST"
            )

            print(
                "========== LINE WEBHOOK END ==========\n"
            )

            return JsonResponse(
                {
                    "status":
                    "ok"
                },
                status=200,
            )


        # ------------------------------------------
        # Event
        # ------------------------------------------

        for event in events:

            print(
                "STEP 3: EVENT"
            )

            print(
                "EVENT TYPE:",
                event.get(
                    "type"
                )
            )


            if event.get(
                "type"
            ) != "message":

                continue


            message = event.get(
                "message",
                {},
            )


            if message.get(
                "type"
            ) != "text":

                continue


            text = message.get(
                "text",
                "",
            )


            reply_token = event.get(
                "replyToken"
            )


            line_user_id = event.get(
                "source",
                {},
            ).get(
                "userId"
            )


            print(
                "MESSAGE:",
                text
            )

            print(
                "LINE USER ID:",
                line_user_id
            )


            # ------------------------------------------
            # Parser
            # ------------------------------------------

            print(
                "STEP 4: PARSER"
            )


            result = parse_financial_message(
                text
            )


            print(
                "PARSE RESULT:",
                result
            )


            # ------------------------------------------
            # Parser สำเร็จ
            # ------------------------------------------

            if result and result.get(
                "success"
            ):

                print(
                    "STEP 5: FIND USER"
                )


                user = User.objects.filter(
                    line_uid=line_user_id
                ).first()


                print(
                    "USER FOUND:",
                    user is not None,
                )


                # --------------------------------------
                # ยังไม่ได้เชื่อม LINE
                # --------------------------------------

                if user is None:

                    reply_message = (
                        "ยังไม่พบบัญชีที่เชื่อมกับ LINE นี้ค่ะ "
                        "กรุณาสมัครหรือเข้าสู่ระบบ"
                        "ด้วยบัญชี LINE เดียวกันก่อน"
                    )


                else:

                    # ----------------------------------
                    # Category
                    # ----------------------------------

                    print(
                        "STEP 6: CATEGORY"
                    )


                    category_name = result.get(
                        "category",
                        "อื่นๆ",
                    )


                    transaction_type = result.get(
                        "type"
                    )


                    print(
                        "CATEGORY:",
                        category_name,
                    )


                    print(
                        "TRANSACTION TYPE:",
                        transaction_type,
                    )


                    category = Category.objects.filter(
                        name=category_name,
                        transaction_type=transaction_type,
                    ).first()


                    if category is None:

                        print(
                            "CATEGORY NOT FOUND -> CREATE"
                        )


                        category = Category.objects.create(
                            name=category_name,
                            transaction_type=transaction_type,
                        )


                    print(
                        "CATEGORY ID:",
                        category.id,
                    )


                    # ----------------------------------
                    # Transaction
                    # ----------------------------------

                    print(
                        "STEP 7: CREATE TRANSACTION"
                    )


                    now = timezone.localtime()


                    transaction = Transaction.objects.create(

                        user=user,

                        amount=result.get(
                            "amount"
                        ),

                        transaction_type=transaction_type,

                        description=result.get(
                            "description",
                            "",
                        ),

                        category=category,

                        sub_category=result.get(
                            "sub_category",
                            "",
                        ),

                        account=result.get(
                            "account",
                            "",
                        ),

                        transaction_date=now.date(),

                        transaction_time=(
                            now.time().replace(
                                microsecond=0
                            )
                        ),
                    )


                    print(
                        "TRANSACTION CREATED ID:",
                        transaction.id,
                    )


                    # ----------------------------------
                    # ข้อความตอบ
                    # ----------------------------------

                    if transaction_type == "income":

                        type_text = "รายรับ"

                    else:

                        type_text = "รายจ่าย"


                    # ถ้าไม่ได้ระบุบัญชี
                    # หรือช่องทางชำระ
                    # ให้แสดงเป็น "-"
                    account_text = (
                        result.get(
                            "account"
                        )
                        or "-"
                    )


                    reply_message = (
                        f"บันทึกรายการแล้วค่ะ\n"
                        f"ประเภท: {type_text}\n"
                        f"จำนวน: "
                        f"{result.get('amount', 0):,.2f} บาท\n"
                        f"หมวดหมู่: {category_name}\n"
                        f"หมวดหมู่ย่อย: "
                        f"{result.get('sub_category', '')}\n"
                        f"บัญชี: {account_text}\n"
                        f"รายละเอียด: "
                        f"{result.get('description', '')}"
                    )


            # ------------------------------------------
            # Parser ไม่เข้าใจ
            # ------------------------------------------

            else:

                print(
                    "PARSER FAILED"
                )


                reply_message = (
                    "ขอโทษค่ะ ยังไม่เข้าใจรายการนี้ 😅\n"
                    "ลองพิมพ์ เช่น\n"
                    "กินข้าว 60 บาท"
                )


            # ------------------------------------------
            # Reply LINE
            # ------------------------------------------

            print(
                "STEP 8: REPLY LINE"
            )


            if reply_token:

                reply_to_line(
                    reply_token,
                    reply_message,
                )


            print(
                "STEP 8 COMPLETE"
            )


        print(
            "========== LINE WEBHOOK SUCCESS ==========\n"
        )


        return JsonResponse(
            {
                "status":
                "ok"
            },
            status=200,
        )


    except Exception as error:

        print(
            "\n"
        )

        print(
            "!!!!!!!!!! WEBHOOK ERROR !!!!!!!!!!"
        )

        print(
            "ERROR TYPE:",
            type(error).__name__
        )

        print(
            "ERROR MESSAGE:",
            str(error)
        )

        print(
            ""
        )

        print(
            "TRACEBACK:"
        )

        traceback.print_exc()

        print(
            "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
        )

        print(
            "\n"
        )


        return JsonResponse(
            {
                "status":
                "error",

                "error_type":
                type(error).__name__,

                "error":
                str(error),
            },
            status=500,
        )