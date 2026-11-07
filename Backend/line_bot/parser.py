# ใช้ Python พื้นฐาน ไม่ใช้ Regular Expression


def find_numbers(text):
    """คืนค่า (จำนวนเงิน, จุดเริ่ม, จุดสิ้นสุด) จากข้อความ"""
    found = []
    start = -1
    allowed = "0123456789,."
    for index, char in enumerate(text + " "):
        if char in allowed:
            if start == -1:
                start = index
        elif start != -1:
            raw = text[start:index]
            cleaned = raw.replace(",", "")
            try:
                value = float(cleaned)
                if cleaned.count(".") <= 1 and value >= 0:
                    found.append((value, start, index))
            except ValueError:
                pass
            start = -1
    return found


def contains_date(text):
    """ตรวจวันที่รูปแบบ 12/11/2026 หรือ 12-11-2026"""
    for separator in ("/", "-"):
        if separator not in text:
            continue
        for word in text.split():
            parts = word.strip(" ,:()[]").split(separator)
            if len(parts) == 3 and all(part.isdigit() for part in parts):
                if len(parts[2]) in (2, 4):
                    return True
    return False


def get_amount_and_ranges(text):
    """แยกยอดเงินอย่างระมัดระวัง หากกำกวมให้ผู้ใช้ระบุยอดสุทธิ"""
    numbers = find_numbers(text)
    if not numbers:
        return None, [], "ไม่พบจำนวนเงินที่ถูกต้อง"

    if len(numbers) == 1:
        amount = numbers[0][0]
        if amount <= 0:
            return None, [], "จำนวนเงินต้องมากกว่า 0 บาท"
        return amount, [(numbers[0][1], numbers[0][2])], ""

    # รองรับเฉพาะ 'ราคา 200 ลด 50 บาท' หรือ 'ซื้อของ 200 ลด 50 บาท'
    if len(numbers) == 2:
        first, second = numbers
        between = text[first[2]:second[1]].strip()
        if between in ("ลด", "ลดราคา", "ส่วนลด"):
            amount = first[0] - second[0]
            if amount <= 0:
                return None, [], "ส่วนลดต้องน้อยกว่าราคาสินค้า"
            return amount, [(first[1], second[2])], ""

    return None, [], "พบตัวเลขหลายจำนวน กรุณาระบุยอดสุทธิเป็นจำนวนเงินเดียว เช่น ซื้อข้าวและน้ำ 70 บาท"


def remove_keyword(text, keyword):
    """ลบคำที่พบแบบไม่สนใจตัวพิมพ์เล็กใหญ่"""
    position = text.lower().find(keyword.lower())
    if position < 0:
        return text
    return text[:position] + text[position + len(keyword):]


def remove_ranges(text, ranges):
    for start, end in sorted(ranges, reverse=True):
        text = text[:start] + text[end:]
    return text



# ==================================================
# วิเคราะห์ข้อความทางการเงิน
# ==================================================

def parse_financial_message(text, transaction_type):

    if transaction_type not in ("income", "expense"):
        return {"success": False, "message": "กรุณาเลือกโหมดรายรับหรือรายจ่ายก่อน"}

    # วันที่ในข้อความยังไม่รองรับการบันทึกย้อนหลังผ่าน LINE
    if contains_date(text):
        return {"success": False, "message": "ยังไม่รองรับการระบุวันที่ในข้อความ กรุณาบันทึกรายการแล้วแก้วันที่บนเว็บไซต์"}

    amount, amount_ranges, error = get_amount_and_ranges(text)
    if error:
        return {"success": False, "message": error}

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


    # ชื่อรายการ: ตัดยอดเงินและช่องทางออกก่อน
    item_name = remove_ranges(text.strip(), amount_ranges)
    if matched_account:
        item_name = remove_keyword(item_name, matched_account)

    # ตัดชื่อร้านที่ระบุท้ายข้อความออกจากชื่อรายการเท่านั้น
    # ยังคงใช้ข้อความต้นฉบับสำหรับจับหมวดหมู่ เช่น เซเว่น -> ซูเปอร์มาร์เก็ต
    if transaction_type == "expense":
        stores = ("7-eleven", "เซเว่น", "โลตัส", "บิ๊กซี", "แม็คโคร")
        for store in stores:
            if item_name.lower().endswith(store) and len(item_name) > len(store):
                item_name = item_name[:-len(store)].strip()
                break

    # ลบหน่วยเงินที่เหลืออยู่ และเว้นวรรคส่วนเกิน
    item_name = item_name.strip()
    for unit in ("บาท", "บ.", "฿"):
        if item_name.startswith(unit):
            item_name = item_name[len(unit):].strip()
        if item_name.endswith(unit):
            item_name = item_name[:-len(unit)].strip()
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
    elif item_name.startswith("กิน"):
        item_name = item_name[len("กิน"):]
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