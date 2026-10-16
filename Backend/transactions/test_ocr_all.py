
from Backend.transactions.ocr import (
    read_receipt,
    get_receipt_amount,
    extract_datetime,
)

for i in range(1, 8):
    image_path = f"Backend/testpic_{i}.jpg"

    print(f"\n========== รูปที่ {i} ==========")

    try:
        text = read_receipt(image_path)
        amount, status = get_receipt_amount(text)
        date_time = extract_datetime(text)

        print("ยอดเงิน:", amount)
        print("สถานะ:", status)
        print("วันที่และเวลา:", date_time)
        print("ข้อความ OCR:")
        print(text)

    except Exception as e:
        print("เกิดข้อผิดพลาด:", e)
