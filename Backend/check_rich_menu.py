import os
import requests
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")

headers = {
    "Authorization": f"Bearer {TOKEN}"
}

BASE_URL = "https://api.line.me/v2/bot"

# 1. ตรวจสอบ Default Rich Menu ID
response = requests.get(
    f"{BASE_URL}/user/all/richmenu",
    headers=headers
)

print("=== DEFAULT RICH MENU ===")
print("HTTP:", response.status_code)
print(response.text)

if response.status_code != 200:
    print("\nไม่สามารถตรวจสอบ Default Rich Menu ได้")
    exit()

rich_menu_id = response.json().get("richMenuId")

# 2. ตรวจสอบรายละเอียด Rich Menu ที่กำลังใช้งาน
response = requests.get(
    f"{BASE_URL}/richmenu/{rich_menu_id}",
    headers=headers
)

print("\n=== RICH MENU DETAILS ===")
print("HTTP:", response.status_code)

if response.status_code == 200:
    menu = response.json()

    for index, area in enumerate(menu.get("areas", []), start=1):
        action = area.get("action", {})

        print(f"\nเมนู {index}")
        print("Type:", action.get("type"))
        print("Data:", action.get("data"))
        print("URI:", action.get("uri"))