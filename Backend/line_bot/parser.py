import re

from django.utils import text

#แปลงข้อความจาก Line มาเก็บใส่ตัวแปร
def parse_financial_message(text):

    # 1.ใช้ regex เพื่อค้นหาจำนวนเงินในข้อความ
    amount_match = re.search(
        r'(\d+(?:\.\d{1,2})?)\s*(?:บาท|บ\.?)?',
        text
    )
    if not amount_match:
        return None
    
    amount = float(amount_match.group(1))

    # 2. ตรวจสอบประเภทโดยใช้ keywords ระบุว่าเป็นรายรับหรือรายจ่าย
    income_keywords = [
        "เงินเดือน",
        "รายรับ",
        "ได้เงิน",
        "รับเงิน",
        "โบนัส",
        "ค่าจ้าง",
        "ขายของ",
        "ได้เงินมา",
    ]

    expense_keywords = [
        "กิน",
        "อาหาร",
        "ข้าว",
        "ซื้อ",
        "จ่าย",
        "ค่า",
        "เดินทาง",
        "กาแฟ",
        "ช้อป",
        "เติมน้ำมัน",
    ]

    transaction_type = None

    for keyword in income_keywords:
        if keyword in text:
            transaction_type = "income"
            break

    if transaction_type is None:
        for keyword in expense_keywords:
            if keyword in text:
                transaction_type = "expense"
                break
            
    # 3. กรณีที่ระบุไม่ได้
    if transaction_type is None:
        transaction_type = "expense"

    # 3. กรณีที่ระบุไม่ได้
    if transaction_type is None:
        return {
            "success": False,
            "message": "ไม่สามารถระบุได้ว่าเป็นรายรับหรือรายจ่าย"
        }

    # 4. กำหนดหมวดหมู่
    #ค่าเริ่มต้น
    category = "อื่นๆ"

    if any(keyword in text for keyword in [
        "กิน",
        "ข้าว",
        "อาหาร",
        "กาแฟ",
    ]):
        category = "อาหาร"

    elif any(keyword in text for keyword in [
        "รถ",
        "น้ำมัน",
        "แท็กซี่",
        "เดินทาง",
        "รถไฟ",
        "รถเมล์",
    ]):
        category = "การเดินทาง"

    elif any(keyword in text for keyword in [
        "ค่าไฟ",
        "ค่าน้ำ",
        "ค่าโทรศัพท์",
        "ค่าเน็ต",
        "อินเทอร์เน็ต",
    ]):
        category = "สาธารณูปโภค"

    elif any(keyword in text for keyword in [
        "ซื้อ",
        "ช้อป",
        "เสื้อ",
        "รองเท้า",
    ]):
        category = "ช้อปปิ้ง"

    elif any(keyword in text for keyword in [
        "เงินเดือน",
        "โบนัส",
        "ค่าจ้าง",
    ]):
        category = "เงินเดือน"


    # 5. return ข้อมูลที่จะเอาไปแสดง
    return {
        "success": True,
        "type": transaction_type,
        "amount": amount,
        "category": category,
        "description": text,
    }