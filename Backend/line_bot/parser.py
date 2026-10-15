import pandas as pd


EXCEL_FILE = "financial_data.xlsx"


# ==================================================
# อ่าน Brand Database จาก Excel
# ==================================================

def load_brand_database():

    try:

        df = pd.read_excel(
            EXCEL_FILE,
            sheet_name="Brand_Database"
        )

        brands = {}

        for index, row in df.iterrows():

            # ถ้าไม่มี Keyword ให้ข้าม
            if pd.isna(row["Keyword"]):
                continue

            keyword = str(
                row["Keyword"]
            ).strip().lower()

            brands[keyword] = {
                "type": str(
                    row["Type"]
                ).strip().lower(),

                "category": str(
                    row["Category"]
                ).strip(),

                "sub_category": str(
                    row["Sub_Category"]
                ).strip(),
            }

        return brands

    except Exception as error:

        print(
            "Cannot read Brand_Database:",
            error
        )

        return {}


# ==================================================
# วิเคราะห์ข้อความทางการเงิน
# ==================================================

def parse_financial_message(text):

    # -------------------------
    # 1. หาจำนวนเงิน
    # -------------------------

    amount = 0

    words = text.split()

    for word in words:

        clean_word = (
            word
            .replace("บาท", "")
            .replace("บ.", "")
            .replace(",", "")
            .strip()
        )

        try:

            amount = float(clean_word)

            break

        except ValueError:

            continue

    # ถ้าหาจำนวนเงินไม่เจอ
    if amount <= 0:

        return {
            "success": False,
            "message": "ไม่พบจำนวนเงิน"
        }


    # -------------------------
    # 2. เตรียมข้อความ
    # -------------------------

    text_lower = text.lower()

    description = (
        text
        .replace("บาท", "")
        .replace("บ.", "")
        .strip()
    )


    # -------------------------
    # 3. หา Account / ช่องทางชำระ
    # -------------------------

    # ถ้าไม่ได้ระบุช่องทางชำระ
    # ให้เป็นค่าว่าง ไม่เดาว่าเป็นเงินสด
    account = ""


    account_keywords = {

        # -------------------------
        # ShopeePay
        # ต้องไว้ก่อน "shopeepay"
        # เพื่อไม่ให้ ShopeePay Later
        # ถูกจับเป็น ShopeePay ก่อน
        # -------------------------

        "shopeepay later": "ShopeePay Later",
        "shopee pay later": "ShopeePay Later",
        "ช้อปปี้เพย์ later": "ShopeePay Later",
        "ช้อปปี้เพย์เลเทอร์": "ShopeePay Later",
        "spaylater": "ShopeePay Later",
        "spay later": "ShopeePay Later",

        "shopeepay": "ShopeePay",
        "shopee pay": "ShopeePay",
        "ช้อปปี้เพย์": "ShopeePay",


        # -------------------------
        # ธนาคาร
        # -------------------------

        "กสิกร": "กสิกร",
        "kbank": "กสิกร",

        "ไทยพาณิชย์": "ไทยพาณิชย์",
        "scb": "ไทยพาณิชย์",

        "กรุงเทพ": "กรุงเทพ",
        "bbl": "กรุงเทพ",

        "กรุงไทย": "กรุงไทย",
        "ktb": "กรุงไทย",

        "กรุงศรี": "กรุงศรี",
        "bay": "กรุงศรี",


        # -------------------------
        # บัตร
        # -------------------------

        "บัตรเครดิต": "บัตรเครดิต",
        "credit card": "บัตรเครดิต",


        # -------------------------
        # เงินสด
        # -------------------------

        "เงินสด": "เงินสด",
        "cash": "เงินสด",


        # -------------------------
        # TrueMoney
        # -------------------------

        "truemoney": "TrueMoney",
        "true money": "TrueMoney",
        "ทรูมันนี่": "TrueMoney",


        # -------------------------
        # PromptPay
        # -------------------------

        "พร้อมเพย์": "พร้อมเพย์",
        "promptpay": "พร้อมเพย์",
        "prompt pay": "พร้อมเพย์",
    }


    for keyword, account_name in account_keywords.items():

        if keyword in text_lower:

            account = account_name

            break


    # -------------------------
    # 4. ค่าเริ่มต้น
    # -------------------------

    transaction_type = "expense"

    category = "อื่นๆ"

    sub_category = "ทั่วไป"

    is_known_brand = False


    # -------------------------
    # 5. หา Brand จาก Excel
    # -------------------------

    brands = load_brand_database()

    for keyword, brand in brands.items():

        if keyword in text_lower:

            transaction_type = brand["type"]

            category = brand["category"]

            sub_category = brand["sub_category"]

            is_known_brand = True

            break


    # -------------------------
    # 6. ตรวจว่าเป็นรายรับหรือไม่
    # -------------------------

    income_words = [
        "เงินเดือน",
        "โบนัส",
        "ขายได้",
        "รายรับ",
        "รับเงิน",
        "ได้เงิน",
        "ปันผล",
        "ดอกเบี้ย",
        "cashback",
        "เงินคืน",
    ]


    for word in income_words:

        if word in text_lower:

            transaction_type = "income"

            if category == "อื่นๆ":

                category = "รายได้"

                sub_category = "ทั่วไป"

            break


    # -------------------------
    # 7. ส่งข้อมูลกลับ
    # -------------------------

    return {
        "success": True,
        "type": transaction_type,
        "amount": amount,
        "category": category,
        "sub_category": sub_category,
        "account": account,
        "description": description,
        "is_known_brand": is_known_brand,
    }