import os
import re
import tempfile

from datetime import datetime
from pathlib import Path

from .ocr_engine import run_ocr
from .slip_parser import parse_slip


def _get_texts(raw_pages):
    """ดึงข้อความจากผลลัพธ์ PaddleOCR"""
    lines = []

    for page in raw_pages:
        data = page.get("res", page)
        texts = data.get("rec_texts", [])

        for item in texts:
            text = str(item).strip()
            if text:
                lines.append(text)

    return lines


def read_receipt_data(image_path):
    """
    อ่านข้อความและแยกข้อมูลจากรูปด้วย PaddleOCR
    รองรับทั้งตำแหน่งไฟล์และ file object จาก Django
    """
    temp_path = None

    try:
        if isinstance(image_path, (str, os.PathLike)):
            path = str(image_path)
        else:
            suffix = Path(
                getattr(image_path, "name", "receipt.jpg")
            ).suffix or ".jpg"

            with tempfile.NamedTemporaryFile(
                suffix=suffix, delete=False
            ) as temp_file:
                if hasattr(image_path, "seek"):
                    image_path.seek(0)

                if hasattr(image_path, "chunks"):
                    for chunk in image_path.chunks():
                        temp_file.write(chunk)
                else:
                    temp_file.write(image_path.read())

                temp_path = temp_file.name

            path = temp_path

        raw_pages = run_ocr(path)
        lines = _get_texts(raw_pages)

        # ใช้ parser ของสลิป SCB ช่วยตรวจสอบข้อมูล
        parsed = parse_slip(raw_pages)

        # คงรูปแบบข้อความสำหรับ API เดิม
        text = "\n".join(lines)

        # เพิ่มข้อมูลที่ parser อ่านได้ในกรณีข้อความ OCR
        # ไม่มี label แต่ parser สามารถแยกข้อมูลได้
        if parsed.get("amount") is not None:
            text += f"\nยอดโอน {parsed['amount']}"

        if parsed.get("date"):
            text += f"\nวันที่ {parsed['date']}"

        return {
            "raw_text": text,
            "parsed": parsed,
        }

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


def read_receipt(image_path):
    """อ่านและคืนข้อความ OCR ในรูปแบบที่ API เดิมใช้"""
    return read_receipt_data(image_path)["raw_text"]


def find_numbers(line):
    """ค้นหาตัวเลขที่อาจเป็นจำนวนเงิน"""
    pattern = (
        r"(?<!\d)(\d{1,3}(?:,\d{3})+|\d+)"
        r"(?:\.(\d{1,2}))?(?!\d)"
    )

    results = []

    for match in re.finditer(pattern, line):
        integer_part = match.group(1).replace(",", "")
        decimal_part = (match.group(2) or "0").ljust(2, "0")

        try:
            results.append(
                float(f"{integer_part}.{decimal_part}")
            )
        except ValueError:
            continue

    return results


def extract_amount(text):
    """ค้นหายอดเงินโดยใช้คำสำคัญ"""
    lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip()
    ]

    keywords = [
        "ยอดโอน",
        "ยอดชำระ",
        "จำนวนเงิน",
        "จำนวน",
        "ยอดรวม",
        "รวมสุทธิ",
        "สุทธิ",
        "amount",
        "total",
    ]

    for i, line in enumerate(lines):
        if any(word.casefold() in line.casefold()
               for word in keywords):
            for candidate in lines[i:i + 3]:
                if "ค่าธรรมเนียม" in candidate:
                    break

                numbers = find_numbers(candidate)
                if numbers:
                    return numbers[-1]

    return None


def estimate_items_total(text):
    """สงวนฟังก์ชันเดิมไว้เพื่อให้ส่วนอื่นเรียกได้"""
    return None


def estimate_7delivery_total(text):
    """ประมาณยอดจากรายการสินค้า 7Delivery เมื่อหาไม่พบ"""
    if "รายการสินค้า" not in text:
        return None

    item_text = text.split("รายการสินค้า")[-1]

    stop_words = [
        "M-Stamp",
        "ภารกิจช้อป",
        "สิทธิ์แลก",
        "ดูใบกำกับ",
        "ขอใบกำกับ",
    ]

    prices = []

    for line in item_text.splitlines():
        if any(word in line for word in stop_words):
            break

        numbers = find_numbers(line)
        if numbers:
            prices.append(numbers[-1])

    if not prices:
        return None

    return round(sum(prices), 2)


def get_receipt_amount(text):
    """คืนค่า (จำนวนเงิน, สถานะ) ให้ตรงกับ API เดิม"""
    amount = extract_amount(text)

    if amount is not None:
        return amount, "confirmed_by_ocr"

    # ใช้ parser เดิมช่วยค้นหาจำนวนเงินจากข้อความ
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    raw_pages = [{
        "res": {
            "rec_texts": lines,
            "rec_scores": [],
        }
    }]

    try:
        parsed = parse_slip(raw_pages)
        amount = parsed.get("amount")

        if amount is not None:
            return float(amount), "confirmed_by_ocr"
    except (TypeError, ValueError, KeyError):
        pass

    amount = estimate_7delivery_total(text)

    if amount is not None:
        return amount, "estimated_from_items"

    return None, "not_found"


def format_datetime(day, month, year, hour, minute):
    """แปลงวันที่เป็น ค.ศ. ในรูปแบบ YYYY-MM-DD HH:MM"""
    if year >= 2400:
        year -= 543
    elif year < 100:
        year += 1957

    try:
        result = datetime(year, month, day, hour, minute)
        return result.strftime("%Y-%m-%d %H:%M")
    except ValueError:
        return None


def extract_datetime(text):
    """อ่านวันที่และเวลาจากข้อความ OCR"""
    thai_digits = "๐๑๒๓๔๕๖๗๘๙"

    for i, digit in enumerate(thai_digits):
        text = text.replace(digit, str(i))

    # ตัวอย่าง 08/10/69 14:30 หรือ 08-10-2569 14:30
    numeric_pattern = (
        r"(?<!\d)(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})"
        r"\s*(?:\||-|,)?\s*(\d{1,2}):(\d{2})(?!\d)"
    )

    match = re.search(numeric_pattern, text)

    if match:
        day, month, year, hour, minute = map(int, match.groups())
        return format_datetime(day, month, year, hour, minute)

    months = {
        "ม.ค.": 1, "ก.พ.": 2, "มี.ค.": 3,
        "เม.ย.": 4, "พ.ค.": 5, "มิ.ย.": 6,
        "ก.ค.": 7, "ส.ค.": 8, "ก.ย.": 9,
        "ต.ค.": 10, "พ.ย.": 11, "ธ.ค.": 12,
    }

    for month_name, month_number in months.items():
        pattern = (
            rf"(\d{{1,2}})\s*{re.escape(month_name)}\s*"
            rf"(\d{{2,4}})\s*(?:-|,)?\s*"
            rf"(\d{{1,2}}):(\d{{2}})"
        )

        match = re.search(pattern, text)

        if match:
            day, year, hour, minute = map(int, match.groups())
            return format_datetime(
                day, month_number, year, hour, minute
            )

    return None
