import csv
import re
from pathlib import Path
from django.conf import settings


CSV_FILE = Path(settings.BASE_DIR) / "financial_data.csv"


# ==================================================
# อ่าน Brand Database จาก Excel
# ==================================================

def load_brand_database():
    """Read UTF-8 CSV using Python standard library (no openpyxl)."""
    brands = {}
    try:
        with CSV_FILE.open("r", encoding="utf-8-sig", newline="") as file:
            for row in csv.DictReader(file):
                keyword = (row.get("Keyword") or "").strip().lower()
                if not keyword:
                    continue
                brands[keyword] = {
                    "type": (row.get("Type") or "").strip().lower(),
                    "category": (row.get("Category") or "").strip(),
                    "sub_category": (row.get("Sub_Category") or "").strip(),
                }
    except (OSError, csv.Error) as error:
        print("Cannot read Brand_Database CSV:", error)
    return brands


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


    # หมวดหมู่หลักตรงกับ Supabase; คำจาก Excel ใช้ช่วยจับแบรนด์เท่านั้น
    expense_categories = {
        "อาหาร": ["ข้าว", "อาหาร", "ก๋วยเตี๋ยว", "ขนม", "มื้อ", "หมูกระทะ"],
        "เครื่องดื่ม": ["ชา", "กาแฟ", "น้ำดื่ม", "น้ำอัดลม", "เครื่องดื่ม", "ชานม", "ลาเต้"],
        "ของใช้": ["สบู่", "ยาสีฟัน", "ทิชชู่", "ผงซักฟอก", "ของใช้"],
        "ชอปปิ้ง": ["ช้อปปิ้ง", "ชอปปิ้ง", "เสื้อ", "รองเท้า", "กระเป๋า", "shopee", "lazada"],
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
    brands = load_brand_database()
    mapping = income_categories if transaction_type == "income" else expense_categories

    # จับแบรนด์ที่ตรงกับโหมดปัจจุบันก่อน
    for keyword in sorted(brands, key=len, reverse=True):
        if keyword and keyword in text_lower:
            brand = brands[keyword]
            if brand.get("type") != transaction_type:
                continue
            candidate = brand.get("category", "").strip()
            aliases = {"ช้อปปิ้ง": "ชอปปิ้ง", "การเดินทาง": "ค่าเดินทาง"}
            candidate = aliases.get(candidate, candidate)
            if candidate in mapping:
                category = candidate
            sub_category = brand.get("sub_category", "")
            is_known_brand = True
            break

    # ถ้า CSV ไม่รู้จักหมวด ให้ใช้คำสำคัญแบบ Rule-Based
    if category == "อื่นๆ":
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
        "description": description,
        "is_known_brand": is_known_brand,
    }
