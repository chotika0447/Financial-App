
# แยกข้อมูลจากข้อความ OCR ของสลิป SCB
import re
from datetime import datetime


# ชื่อเดือนภาษาไทย
THAI_MONTHS = {
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


# คำที่ใช้ระบุผู้ส่ง
SENDER_KEYWORDS = [
    r"จาก",
    r"FROM",
    r"ผู้โอน",
    r"ชื่อผู้โอน",
    r"ผู้ชำระ",
    r"ผู้ชำระเงิน",
    r"โอนจาก",
    r"ต้นทาง",
]

# คำที่ใช้ระบุผู้รับ
RECEIVER_KEYWORDS = [
    r"ไปยัง",
    r"TO",
    r"ผู้รับ",
    r"ชื่อผู้รับ",
    r"ผู้รับเงิน",
    r"ผู้รับโอน",
    r"ปลายทาง",
    r"โอนไปยัง",
]

# คำที่ใช้ระบุจำนวนเงิน
AMOUNT_KEYWORDS = [
    r"จำนวนเงิน",
    r"จำนวน",
    r"AMOUNT",
    r"TRANSFER\s+AMOUNT",
    r"TOTAL\s+AMOUNT",
    r"ยอดเงิน",
    r"ยอดโอน",
    r"ยอดชำระ",
    r"เงินที่โอน",
]

# คำที่ใช้ระบุบันทึกช่วยจำ
MEMO_KEYWORDS = [
    r"บันทึกช่วยจำ",
    r"NOTE",
    r"MEMO",
    r"REMARKS?",
    r"หมายเหตุ",
    r"รายละเอียด",
]

# คำที่ใช้ระบุค่าธรรมเนียม
FEE_KEYWORDS = [
    r"ค่าธรรมเนียม",
    r"FEE",
    r"SERVICE\s+FEE",
    r"TRANSACTION\s+FEE",
]

# คำที่ใช้ระบุข้อมูลเพิ่มเติมจากผู้ให้บริการ
PROVIDER_INFO_KEYWORDS = [
    r"ข้อมูลเพิ่มเติมจากผู้ให้บริการ",
    r"ADDITIONAL\s+INFORMATION",
    r"PROVIDER\s+INFORMATION",
    r"ข้อมูลเพิ่มเติม",
]

# ข้อความที่ไม่ควรนำมาเป็นชื่อ
IGNORE_TEXT = {
    "จาก",
    "ไปยัง",
    "จำนวนเงิน",
    "บันทึกช่วยจำ",
    "ค่าธรรมเนียม",
    "ข้อมูลเพิ่มเติมจากผู้ให้บริการ",
    "ผู้รับเงินสามารถสแกนคิวอาร์โค้ดนี้",
    "เพื่อตรวจสอบสถานะการโอนเงิน",
    "เพื่อตรวจสอบสถานะการจ่ายเงิน",
    "เพื่อตรวจสอบสถานะการเติมเงิน",
}


def get_ocr_texts(raw_pages, min_confidence=0.5):
    """ดึงข้อความจาก OCR และกรองข้อความว่างหรือคะแนนต่ำ"""

    lines = []

    for page in raw_pages:
        data = page.get("res", page)

        texts = data.get("rec_texts", [])
        scores = data.get("rec_scores", [])

        for i, text in enumerate(texts):
            text = str(text).strip()

            if not text:
                continue

            score = None

            if i < len(scores):
                try:
                    score = float(scores[i])
                except (TypeError, ValueError):
                    pass

            if score is not None and score < min_confidence:
                continue

            lines.append({
                "text": text,
                "confidence": score,
            })

    return lines


def is_valid_name(text):
    """
    ยอมรับเฉพาะอักษรไทย/อังกฤษ ช่องว่าง จุด และขีดกลาง
    ต้องมีตัวอักษรอย่างน้อยหนึ่งตัว และห้ามมีตัวเลข
    """

    if not text:
        return False

    text = text.strip()

    if text in IGNORE_TEXT:
        return False

    if re.search(r"\d", text):
        return False

    if not re.search(r"[ก-๙a-zA-Z]", text):
        return False

    return bool(re.fullmatch(r"[ก-๙a-zA-Z\s.\-]+", text))



def find_person_near_label(lines, keywords):
    """ค้นหาชื่อจาก Keyword และตรวจสอบข้อความรอบข้าง"""

    label_pattern = "|".join(
        rf"(?<![A-Za-z])(?:{keyword})(?![A-Za-z])"
        for keyword in keywords
    )

    for index, item in enumerate(lines):
        text = item["text"].strip()

        match = re.search(
            rf"^\s*(?:{label_pattern})\s*[:：]?\s*(.*?)\s*$",
            text,
            flags=re.IGNORECASE,
        )

        if not match:
            continue

        # กรณี Keyword และชื่ออยู่บรรทัดเดียวกัน
        inline_value = match.group(1).strip()

        if is_valid_name(inline_value):
            return inline_value

        # ลองอ่านข้อความถัดไปไม่เกิน 2 บรรทัด
        for i in range(index + 1, min(index + 3, len(lines))):
            candidate = lines[i]["text"].strip()

            if is_valid_name(candidate):
                return candidate

            # หยุดเมื่อเจอ Keyword ของข้อมูลส่วนอื่น
            if re.search(
                r"จาก|ไปยัง|จำนวนเงิน|บันทึกช่วยจำ|"
                r"ค่าธรรมเนียม|ข้อมูลเพิ่มเติมจากผู้ให้บริการ|"
                r"(?<![A-Za-z])(?:FROM|TO|AMOUNT|NOTE|MEMO)(?![A-Za-z])",
                candidate,
                flags=re.IGNORECASE,
            ):
                break

        # หากค่าด้านหลังใช้ไม่ได้ ให้ลองอ่านด้านหน้า
        for i in range(index - 1, max(index - 3, -1), -1):
            candidate = lines[i]["text"].strip()

            if is_valid_name(candidate):
                return candidate

        return None

    return None

#กรณีไม่มี keyword จะระผู้โอน/ผู้รับจะดูจากลำดับบนลงล่าง
def find_people_by_order(lines):
    """
    วิธีสำรองเมื่อไม่มี Keyword ผู้ส่งและผู้รับเลย
    เลือกข้อความที่ดูเหมือนชื่อจากบนลงล่าง 2 รายการแรก
    """

    candidates = []

    ignored_phrases = [
        "จ่ายบิลสำเร็จ",
        "โอนเงินสำเร็จ",
        "เติมเงินสำเร็จ",
        "ผู้รับเงินสามารถสแกน",
        "เพื่อตรวจสอบสถานะ",
        "ข้อมูลเพิ่มเติม",
        "จำนวนเงิน",
        "บันทึกช่วยจำ",
        "ค่าธรรมเนียม",
    ]

    for item in lines:
        text = item["text"].strip()

        if any(
            phrase.casefold() in text.casefold()
            for phrase in ignored_phrases
        ):
            continue

        if is_valid_name(text):
            candidates.append(text)

    if len(candidates) >= 2:
        return candidates[0], candidates[1]

    return None, None


def parse_date(lines):
    """แปลงวันที่ภาษาไทยเป็น YYYY-MM-DD HH:MM"""

    months_pattern = "|".join(
        re.escape(month)
        for month in sorted(THAI_MONTHS, key=len, reverse=True)
    )

    date_pattern = re.compile(
        rf"(\d{{1,2}})\s+"
        rf"({months_pattern})\s+"
        rf"(\d{{4}})\s*[-–]?\s*"
        rf"(\d{{1,2}}):(\d{{2}})"
    )

    for item in lines:
        match = date_pattern.search(item["text"])

        if not match:
            continue

        day = int(match.group(1))
        month = THAI_MONTHS[match.group(2)]
        year = int(match.group(3))
        hour = int(match.group(4))
        minute = int(match.group(5))

        # แปลง พ.ศ. เป็น ค.ศ.
        if year >= 2400:
            year -= 543

        try:
            parsed = datetime(year, month, day, hour, minute)
            return parsed.strftime("%Y-%m-%d %H:%M")
        except ValueError:
            return None

    return None



def parse_amount(lines):
    """ค้นหาจำนวนเงินโดยใช้ Keyword หลายภาษา"""

    keywords = "|".join(
        rf"(?<![A-Za-z])(?:{keyword})(?![A-Za-z])"
        for keyword in AMOUNT_KEYWORDS
    )

    amount_pattern = re.compile(
        r"(?<![\d.])(\d[\d,]*)(?:\.(\d{1,2}))?(?!\d)"
    )

    for i, item in enumerate(lines):
        text = item["text"].strip()

        match_label = re.search(
            rf"(?:{keywords})\s*[:：]?\s*(.*)",
            text,
            flags=re.IGNORECASE,
        )

        if not match_label:
            continue

        candidates = [match_label.group(1).strip()]

        if i + 1 < len(lines):
            candidates.append(lines[i + 1]["text"].strip())

        for candidate in candidates:
            match = amount_pattern.search(candidate)

            if not match:
                continue

            integer_part = match.group(1).replace(",", "")
            decimal_part = match.group(2) or "00"

            try:
                amount = int(integer_part) + int(decimal_part) / 100
                return f"{amount:.2f}"
            except ValueError:
                continue

    return None


def find_labeled_value(lines, label_pattern):
    """
    หาโน้ตหลัง label
    รองรับทั้งกรณีที่ค่าอยู่บรรทัดเดียวกันหรือบรรทัดถัดไป
    """

    for i, item in enumerate(lines):
        text = item["text"].strip()

        match = re.match(
            rf"^\s*(?:{label_pattern})\s*[:：]?\s*(.*?)\s*$",
            text,
            flags=re.IGNORECASE,
        )

        if not match:
            continue

        # กรณีมีค่าอยู่หลัง label ในบรรทัดเดียวกัน
        value = match.group(1).strip()

        if value:
            return value

        # กรณีค่าอยู่บรรทัดถัดไป
        if i + 1 < len(lines):
            next_value = lines[i + 1]["text"].strip()

            if next_value and next_value not in IGNORE_TEXT:
                return next_value

        return None

    return None

def parse_notes(lines):
    """ค้นหาโน้ต ค่าธรรมเนียม และข้อมูลเพิ่มเติม"""

    return {
        "memo": find_labeled_value(
            lines,
            "|".join(MEMO_KEYWORDS),
        ),
        "fee": find_labeled_value(
            lines,
            "|".join(FEE_KEYWORDS),
        ),
        "provider_info": find_labeled_value(
            lines,
            "|".join(PROVIDER_INFO_KEYWORDS),
        ),
    }


def parse_slip(raw_pages):
    """แปลงผล OCR เป็นข้อมูลสลิป"""

    lines = get_ocr_texts(raw_pages)

    date = parse_date(lines)
    sender = find_person_near_label(lines, SENDER_KEYWORDS)
    receiver = find_person_near_label(lines, RECEIVER_KEYWORDS)
    amount = parse_amount(lines)
    note = parse_notes(lines)

    # ต้องตรวจสอบข้อมูลหลักทั้งหมด
    needs_review = (
        not date
        or not is_valid_name(sender)
        or not is_valid_name(receiver)
        or amount is None
    )

    return {
        "date": date,
        "sender": sender,
        "receiver": receiver,
        "amount": amount,
        "note": note,
        "needs_review": needs_review,
        "ocr_text": [item["text"] for item in lines],
    }
