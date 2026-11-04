import os
import json
import mimetypes
from pathlib import Path

import requests
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")

TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")

JSON_PATH = BASE_DIR / "kanecho_rich_menu.json"
IMAGE_PATH = BASE_DIR / "Kanecho_clean.png"

API_URL = "https://api.line.me/v2/bot"
IMAGE_API_URL = "https://api-data.line.me/v2/bot"


def check_response(response, step):
    if not response.ok:
        print(f"\n❌ {step} ไม่สำเร็จ")
        print("HTTP:", response.status_code)
        print("รายละเอียด:", response.text)
        response.raise_for_status()


def main():
    if not TOKEN:
        raise RuntimeError(
            "ไม่พบ LINE_CHANNEL_ACCESS_TOKEN "
            "กรุณาตั้งค่า Token ใน PowerShell ก่อน"
        )

    if not JSON_PATH.exists():
        raise FileNotFoundError(f"ไม่พบไฟล์ JSON: {JSON_PATH}")

    if not IMAGE_PATH.exists():
        raise FileNotFoundError(
            f"ไม่พบรูปภาพ: {IMAGE_PATH}\n"
            "กรุณาแก้ IMAGE_PATH ให้ตรงกับไฟล์รูปจริง"
        )

    # ตรวจสอบไฟล์ภาพ
    image_size = IMAGE_PATH.stat().st_size
    if image_size > 1_000_000:
        raise ValueError("รูปภาพต้องมีขนาดไม่เกิน 1 MB")

    content_type = mimetypes.guess_type(str(IMAGE_PATH))[0]
    if content_type not in ("image/png", "image/jpeg"):
        raise ValueError("รูปภาพต้องเป็น PNG หรือ JPEG")

    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json",
    }

    # 1. อ่าน JSON
    with open(JSON_PATH, "r", encoding="utf-8") as file:
        menu_data = json.load(file)

    # ป้องกันการส่ง field ที่ไม่ใช่ส่วนของ Rich Menu
    required_fields = ["size", "selected", "name", "chatBarText", "areas"]
    missing = [field for field in required_fields if field not in menu_data]

    if missing:
        raise ValueError(
            "JSON ขาด field ที่จำเป็น: " + ", ".join(missing)
        )

    # 2. สร้าง Rich Menu ใหม่
    print("กำลังสร้าง Rich Menu...")
    response = requests.post(
        f"{API_URL}/richmenu",
        headers=headers,
        json=menu_data,
        timeout=30,
    )
    check_response(response, "สร้าง Rich Menu")

    rich_menu_id = response.json()["richMenuId"]
    print("สร้างสำเร็จ:", rich_menu_id)

    # 3. อัปโหลดภาพให้ Rich Menu
    print("กำลังอัปโหลดภาพ...")
    with open(IMAGE_PATH, "rb") as image_file:
        response = requests.post(
            f"{IMAGE_API_URL}/richmenu/{rich_menu_id}/content",
            headers={
                "Authorization": f"Bearer {TOKEN}",
                "Content-Type": content_type,
            },
            data=image_file,
            timeout=60,
        )
    check_response(response, "อัปโหลดภาพ")

    print("อัปโหลดภาพสำเร็จ")

    # 4. ตั้ง Rich Menu ใหม่เป็นเมนูเริ่มต้น
    confirm = input(
        "\nต้องการตั้งเมนูใหม่นี้เป็นเมนูเริ่มต้นของ LINE OA หรือไม่? "
        "พิมพ์ YES เพื่อยืนยัน: "
    )

    if confirm.strip() != "YES":
        print("ยกเลิกการตั้งเมนูเริ่มต้น")
        print("Rich Menu ถูกสร้างและอัปโหลดแล้ว แต่ยังไม่ได้ตั้งเป็น default")
        print("Rich Menu ID:", rich_menu_id)
        return

    response = requests.post(
        f"{API_URL}/user/all/richmenu/{rich_menu_id}",
        headers={"Authorization": f"Bearer {TOKEN}"},
        timeout=30,
    )
    check_response(response, "ตั้งเมนูเริ่มต้น")

    print("\n✅ ตั้ง Rich Menu ใหม่สำเร็จ")
    print("Rich Menu ID:", rich_menu_id)


if __name__ == "__main__":
    main()
