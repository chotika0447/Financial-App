
import re

import pytesseract
from PIL import Image, ImageOps, ImageEnhance

pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)


def read_receipt(image_path):
    image = Image.open(image_path)
    image = ImageOps.exif_transpose(image)
    image = image.convert("L")
    image = ImageEnhance.Contrast(image).enhance(2)

    # ใช้สองโหมดเพื่อรองรับภาพหลายประเภท
    text_psm11 = pytesseract.image_to_string(
        image, lang="tha+eng", config="--psm 11"
    )

    text_psm6 = pytesseract.image_to_string(
        image, lang="tha+eng", config="--psm 6"
    )

    return text_psm11 + "\n" + text_psm6


def find_numbers(line):
    numbers = re.findall(r"\d[\d,]*\.\d{2}\b", line)
    return [float(n.replace(",", "")) for n in numbers]


def extract_amount(text):
    lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip()
    ]

    # 1. ค้นหายอดสุทธิก่อน
    for line in lines:
        if "สุทธิ" in line:
            numbers = find_numbers(line)
            if numbers:
                return numbers[-1]

    # 2. ค้นหายอดจากคำสำคัญ
    keywords = [
        "จำนวน", "จํานวน", "จานวน",
        "ยอดรวม", "รวมสุทธิ"
    ]

    for i, line in enumerate(lines):
        if any(word in line for word in keywords):
            for next_line in lines[i:i + 6]:
                if (
                    "ค่าธรรมเนียม" in next_line
                    or "คาธรรมเนยม" in next_line
                ):
                    break

                numbers = find_numbers(next_line)
                if numbers:
                    return numbers[-1]

    return None


def estimate_items_total(text):
    """
    ประมาณยอดจากราคาสินค้าในใบเสร็จ 7Delivery
    ใช้เมื่อไม่พบยอดชำระจริงเท่านั้น
    """
    # read_receipt รวมผล OCR สองโหมด
    # ใช้เฉพาะส่วนแรก (PSM 11) เพื่อไม่ให้นับซ้ำ
    text = text.split("\n\n", 1)[0] if False else text

    # ยังไม่คำนวณจากตัวเลขทั้งหมด เพราะมีเลขใบเสร็จ
    # ราคาโปรโมชัน และตัวเลขอื่นปะปนกัน
    return None


def estimate_7delivery_total(text):
    # ใช้เฉพาะผล OCR จาก PSM 6
    # เพราะ read_receipt() รวม PSM 11 และ PSM 6 ไว้
    if "รายการสินค้า" not in text:
        return None

    # เลือกข้อความส่วน PSM 6 ซึ่งมีรายการสินค้าเรียงเป็นบรรทัด
    sections = text.split("รายการสินค้า")
    if len(sections) < 2:
        return None

    # ใช้ส่วนรายการสินค้าจากครั้งสุดท้าย (PSM 6)
    item_text = sections[-1]

    # หยุดอ่านเมื่อถึงส่วนโปรโมชันหรือใบกำกับภาษี
    stop_words = [
        "M-Stamp", "ภารกิรช้อป",
        "สิทธิ์แลก", "ดูใบกํากับ",
        "ขอใบกํากับ"
    ]

    prices = []

    for line in item_text.splitlines():
        if any(word in line for word in stop_words):
            break

        numbers = find_numbers(line)

        if numbers:
            # ราคาสินค้ารวมมักอยู่ท้ายบรรทัด
            prices.append(numbers[-1])

    if not prices:
        return None

    return round(sum(prices), 2)


def get_receipt_amount(text):
    # หายอดสุทธิหรือยอดโอนก่อน
    amount = extract_amount(text)

    if amount is not None:
        return amount, "confirmed_by_ocr"

    # ถ้าไม่พบ ลองรวมราคาสินค้า 7Delivery
    amount = estimate_7delivery_total(text)

    if amount is not None:
        return amount, "estimated_from_items"

    return None, "not_found"


from datetime import datetime


def extract_datetime(text):
    # รองรับตัวเลขไทย
    thai_digits = "๐๑๒๓๔๕๖๗๘๙"
    for i, digit in enumerate(thai_digits):
        text = text.replace(digit, str(i))

    # รูปแบบวันที่ 08/10/69 หรือ 05/10/65
    numeric_pattern = (
        r"(\d{1,2})/(\d{1,2})/(\d{2,4})"
        r"\s*(?:\||-|,)?\s*"
        r"(\d{1,2}):(\d{2})"
    )

    match = re.search(numeric_pattern, text)

    if match:
        day, month, year, hour, minute = map(int, match.groups())
        return format_datetime(day, month, year, hour, minute)

    # รูปแบบวันที่ 8 ต.ค. 69 หรือ 08 ต.ค. 2569
    months = {
        "ม.ค.": 1,
        "ก.พ.": 2,
        "มี.ค.": 3,
        "เม.ย.": 4,
        "พ.ค.": 5,
        "มิ.ย.": 6,
        "ก.ค.": 7,
        "ส.ค.": 8,
        "ก.ย.": 9,
        "ต.ค.": 10,
        "พ.ย.": 11,
        "ธ.ค.": 12,
    }

    for month_name, month_number in months.items():
        pattern = (
            rf"(\d{{1,2}})\s*{re.escape(month_name)}"
            rf"\s*(\d{{2,4}})"
            rf"\s*(?:-|,)?\s*"
            rf"(\d{{1,2}}):(\d{{2}})"
        )

        match = re.search(pattern, text)

        if match:
            day, year, hour, minute = map(int, match.groups())
            return format_datetime(
                day, month_number, year, hour, minute
            )

    return None


def format_datetime(day, month, year, hour, minute):
    # แปลง พ.ศ. เป็น ค.ศ.
    if year >= 2400:
        year -= 543
    elif year < 100:
        # ปีสองหลัก เช่น 69 = พ.ศ. 2569
        year += 1957

    try:
        result = datetime(year, month, day, hour, minute)
        return result.strftime("%Y-%m-%d %H:%M")
    except ValueError:
        return None

