from categories.models import Brand, Category


# ตรวจสอบ Keyword ในข้อความ โดยไม่จับบางส่วนของคำภาษาอังกฤษ

def keyword_in_text(keyword, text):
    keyword = (keyword or "").strip().lower()
    text = (text or "").lower()

    if not keyword:
        return False

    # ตรวจตำแหน่งที่พบ Keyword ทีละตำแหน่ง
    for index in range(len(text) - len(keyword) + 1):
        if text[index:index + len(keyword)] != keyword:
            continue

        # ถ้า Keyword ขึ้นต้นด้วยตัวอักษรหรือตัวเลข ASCII
        # ตัวก่อนหน้าต้องไม่ใช่ a-z หรือ 0-9
        if keyword[0].isascii() and keyword[0].isalnum() and index > 0:
            before = text[index - 1]
            if before in "abcdefghijklmnopqrstuvwxyz0123456789":
                continue

        # ถ้า Keyword ลงท้ายด้วยตัวอักษรหรือตัวเลข ASCII
        # ตัวถัดไปต้องไม่ใช่ a-z หรือ 0-9
        end = index + len(keyword)
        if keyword[-1].isascii() and keyword[-1].isalnum() and end < len(text):
            after = text[end]
            if after in "abcdefghijklmnopqrstuvwxyz0123456789":
                continue

        return True

    return False


# ค้นหาหมวดหมู่ส่วนกลางจากชื่อ
def accessible_category(name, transaction_type, user=None):
    if not name:
        return None

    return Category.objects.filter(
        name__iexact=name.strip(),
        transaction_type=transaction_type,
        user__isnull=True,
    ).first()


# หมวดหมู่สำรองเมื่อไม่พบหมวดหมู่ที่ตรงกัน
def fallback_category(transaction_type, user=None):
    category = accessible_category("อื่นๆ", transaction_type)

    if category is None:
        category = accessible_category("อื่น", transaction_type)

    return category


# ฟังก์ชันหลักสำหรับจับคู่หมวดหมู่
def match_category(text, transaction_type, user=None, rule_category="อื่นๆ"):
    # 1. ค้นหา Keyword จากตาราง Brand
    brands = Brand.objects.filter(
        transaction_type=transaction_type,
        category__user__isnull=True,
        category__transaction_type=transaction_type,
    ).select_related("category")

    # ตรวจ Keyword ที่ยาวกว่าก่อน
    brands = sorted(brands, key=lambda brand: len(brand.keyword), reverse=True)

    for brand in brands:
        if keyword_in_text(brand.keyword, text):
            return brand.category

    # 2. ตรวจสอบหมวดหมู่จาก Parser
    if rule_category == "ชอปปิ้ง":
        rule_category = "ช้อปปิ้ง"
    elif rule_category == "การเดินทาง":
        rule_category = "ค่าเดินทาง"

    category = accessible_category(rule_category, transaction_type)

    if category is not None:
        return category

    # 3. ถ้าไม่พบ ให้ใช้หมวดหมู่ อื่นๆ
    return fallback_category(transaction_type)
