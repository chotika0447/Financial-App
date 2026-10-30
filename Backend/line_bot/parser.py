import re


# ==================================================
# วิเคราะห์ข้อความทางการเงิน
# ==================================================

def parse_financial_message(text, transaction_type):

    if transaction_type not in ("income", "expense"):
        return {"success": False, "message": "กรุณาเลือกโหมดรายรับหรือรายจ่ายก่อน"}

    # -------------------------
    # 1. หาจำนวนเงิน
    # -------------------------

    match = re.search(r"(?<![\d])([\d,]+(?:\.\d{1,2})?)\s*(?:บาท|บ\.|฿)(?!\w)", text)
    if not match:
        match = re.search(r"(?<![\d])([\d,]+(?:\.\d{1,2})?)(?![\d])", text)
    amount = float(match.group(1).replace(",", "")) if match else 0
    if amount <= 0:
        return {"success": False, "message": "ไม่พบจำนวนเงินที่ถูกต้อง"}

    # -------------------------
    # 2. เตรียมข้อความ
    # -------------------------

    text_lower = text.lower()

    # หมายเหตุเป็นข้อมูลเสริม
    # ผู้ใช้สามารถเพิ่มหรือแก้ไขภายหลังบนเว็บไซต์
    description = ""


    # -------------------------
    # 3. หา Account / ช่องทางชำระ
    # -------------------------

    # ถ้าไม่ได้ระบุช่องทางชำระ
    # ให้เป็นค่าว่าง ไม่เดาว่าเป็นเงินสด
    account = ""
    matched_account = ""


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
            matched_account = keyword

            break


    # ชื่อรายการ: ตัดจำนวนเงินและช่องทางออกก่อน
    item_name = text.strip()
    if match:
        item_name = item_name[:match.start()] + item_name[match.end():]
    if matched_account:
        item_name = re.sub(re.escape(matched_account), "", item_name, flags=re.IGNORECASE)

    # ลบหน่วยเงินที่เหลืออยู่ และเว้นวรรคส่วนเกิน
    item_name = re.sub(r"^(?:บาท|บ\.|฿)", "", item_name.strip())
    item_name = re.sub(r"(?:บาท|บ\.|฿)$", "", item_name.strip())
    item_name = item_name.strip(" -,:\t")

    # ตัดเฉพาะคำขึ้นต้นที่ไม่ใช่ส่วนหนึ่งของชื่อรายการ
    # เช่น 'จ่ายค่าไฟ' ต้องเหลือ 'ค่าไฟ' ไม่ใช่ 'ไฟ'
    if item_name.startswith("ได้เงินเดือน"):
        item_name = item_name[len("ได้"):]
    elif item_name.startswith("ได้รับ"):
        item_name = item_name[len("ได้รับ"):]
    elif item_name.startswith("รับเงินจาก"):
        item_name = item_name[len("รับเงินจาก"):]
    elif item_name.startswith("ซื้อของ"):
        pass  # คง 'ซื้อของ' ไว้ เพราะยังไม่ทราบชื่อสิ่งของ
    elif item_name.startswith("ซื้อ"):
        item_name = item_name[len("ซื้อ"):]
    elif item_name.startswith("จ่ายค่า"):
        item_name = item_name[len("จ่าย"):]
    elif item_name.startswith("จ่าย"):
        item_name = item_name[len("จ่าย"):]

    item_name = item_name.strip(" -,:\t")
    if not item_name:
        item_name = "ไม่ระบุ"

    # หมวดหมู่หลักตรงกับ Supabase; คำจาก Excel ใช้ช่วยจับแบรนด์เท่านั้น
    expense_categories = {
        "อาหาร": ["ข้าว", "อาหาร", "ก๋วยเตี๋ยว", "ขนม", "มื้อ", "หมูกระทะ"],
        "เครื่องดื่ม": ["ชา", "กาแฟ", "น้ำดื่ม", "น้ำอัดลม", "เครื่องดื่ม", "ชานม", "ลาเต้"],
        "ของใช้": ["สบู่", "ยาสีฟัน", "ทิชชู่", "ผงซักฟอก", "ของใช้"],
        "ช้อปปิ้ง": ["ช้อปปิ้ง", "ชอปปิ้ง", "เสื้อ", "รองเท้า", "กระเป๋า", "shopee", "lazada"],
        "ค่าเดินทาง": ["แท็กซี่", "รถเมล์", "รถไฟ", "bts", "mrt", "น้ำมันรถ", "ค่าเดินทาง", "ค่ารถ", "grab"],
        "ซูเปอร์มาร์เก็ต": ["เซเว่น", "7-eleven", "โลตัส", "บิ๊กซี", "แม็คโคร", "supermarket"],
        "ความบันเทิง": ["ดูหนัง", "โรงหนัง", "เกม", "netflix", "spotify", "disney"],
        "ค่าน้ำไฟ": ["ค่าไฟ", "ค่าน้ำ", "ค่าน้ำไฟ", "ไฟฟ้า"],
        "ค่าเช่า": ["ค่าเช่า", "ค่าหอ", "ค่าเช่าห้อง"],
        "ทำบุญ": ["ทำบุญ", "บริจาค", "ใส่บาตร"],
        "ความงาม": ["เครื่องสำอาง", "สกินแคร์", "ตัดผม", "ทำเล็บ", "ความงาม"],
        "ค่าหมอ": ["ค่าหมอ", "โรงพยาบาล", "คลินิก", "ค่ายา", "รักษา"],
        "ค่าโทรศัพท์": ["ค่าโทรศัพท์", "เติมเงิน", "ค่าเน็ต", "อินเทอร์เน็ต", "แพ็กเกจมือถือ"],
    }
    income_categories = {
        "เงินเดือน": ["เงินเดือน", "salary"],
        "งานเสริม": ["งานเสริม", "ฟรีแลนซ์", "freelance", "ค่าจ้าง", "ขายได้", "ขายของ", "เงินคืน", "ค่าขนม", "ค่าคอมมิชชั่น"],
        "โบนัส": ["โบนัส", "bonus"],
        "ลงทุน": ["ปันผล", "ดอกเบี้ย", "กำไรลงทุน", "ผลตอบแทน", "ลงทุน"],
    }
    # ประเภทถูกกำหนดจาก Rich Menu เท่านั้น ไม่เดาจากข้อความหรือ Excel
    category = "อื่นๆ"
    sub_category = ""
    is_known_brand = False
    mapping = income_categories if transaction_type == "income" else expense_categories
    # Brand and personal-category matching happen in category_matching.py
    # with the authenticated LINE user. Keep this parser focused on parsing.
    for name, keywords in mapping.items():
        if any(word in text_lower for word in keywords):
            category = name
            break

    return {
        "success": True,
        "type": transaction_type,
        "amount": amount,
        "category": category,
        "sub_category": sub_category,
        "account": account,
        "item_name": item_name,
        "description": description,
        "is_known_brand": is_known_brand,
    }
