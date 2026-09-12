from pathlib import Path
from datetime import date

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "Financial-App-progress-report.pdf"
FONT_PATH = Path(r"C:\Windows\Fonts\LeelawUI.ttf")
FONT_BOLD_PATH = Path(r"C:\Windows\Fonts\LeelaUIb.ttf")

pdfmetrics.registerFont(TTFont("Thai", str(FONT_PATH)))
if FONT_BOLD_PATH.exists():
    pdfmetrics.registerFont(TTFont("Thai-Bold", str(FONT_BOLD_PATH)))
else:
    pdfmetrics.registerFont(TTFont("Thai-Bold", str(FONT_PATH)))

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="ThaiTitle", parent=styles["Title"], fontName="Thai-Bold",
    fontSize=22, leading=28, alignment=TA_CENTER, textColor=colors.HexColor("#1f5f3c"),
    spaceAfter=8,
))
styles.add(ParagraphStyle(
    name="ThaiSubtitle", parent=styles["Normal"], fontName="Thai",
    fontSize=10, leading=15, alignment=TA_CENTER, textColor=colors.HexColor("#626b64"),
    spaceAfter=18,
))
styles.add(ParagraphStyle(
    name="ThaiH1", parent=styles["Heading1"], fontName="Thai-Bold",
    fontSize=15, leading=20, textColor=colors.HexColor("#1f5f3c"), spaceBefore=8, spaceAfter=8,
))
styles.add(ParagraphStyle(
    name="ThaiH2", parent=styles["Heading2"], fontName="Thai-Bold",
    fontSize=11.5, leading=16, textColor=colors.HexColor("#2f7d4f"), spaceBefore=5, spaceAfter=4,
))
styles.add(ParagraphStyle(
    name="ThaiBody", parent=styles["BodyText"], fontName="Thai",
    fontSize=9.2, leading=14, textColor=colors.HexColor("#252a26"), spaceAfter=5,
))
styles.add(ParagraphStyle(
    name="ThaiSmall", parent=styles["BodyText"], fontName="Thai",
    fontSize=8, leading=11, textColor=colors.HexColor("#4d554f"),
))
styles.add(ParagraphStyle(
    name="ThaiTable", parent=styles["BodyText"], fontName="Thai",
    fontSize=7.8, leading=10.5, textColor=colors.HexColor("#252a26"),
))
styles.add(ParagraphStyle(
    name="ThaiTableHead", parent=styles["BodyText"], fontName="Thai-Bold",
    fontSize=8, leading=10.5, textColor=colors.white,
))


def p(text, style="ThaiBody"):
    return Paragraph(text, styles[style])


def table(rows, widths):
    converted = []
    for row in rows:
        converted.append([cell if hasattr(cell, "wrap") else p(str(cell), "ThaiTable") for cell in row])
    result = Table(converted, colWidths=widths, repeatRows=1, hAlign="LEFT")
    result.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2f7d4f")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#d7dfd8")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f3f8f0")]),
    ]))
    return result


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Thai", 7.5)
    canvas.setFillColor(colors.HexColor("#7c8478"))
    canvas.drawString(18 * mm, 10 * mm, "Financial-App | รายงานสถานะการพัฒนา")
    canvas.drawRightString(192 * mm, 10 * mm, f"หน้า {doc.page}")
    canvas.restoreState()


story = []
story += [
    Spacer(1, 18 * mm),
    p("รายงานสรุปความคืบหน้าโปรเจกต์ Financial-App", "ThaiTitle"),
    p(f"จัดทำ ณ วันที่ {date.today().strftime('%d/%m/%Y')} | ตรวจจากไฟล์ใน workspace ปัจจุบัน", "ThaiSubtitle"),
    table([
        ["หัวข้อ", "สถานะปัจจุบัน"],
        ["ภาพรวม", "Prototype: มีหน้า dashboard ฝั่งเว็บแล้ว แต่ยังใช้ข้อมูลจำลอง"],
        ["Backend", "มีโครง Django และโมเดล Transaction; ยังไม่มี API หรือการเชื่อม frontend"],
        ["Frontend", "หน้า dashboard React/Vite แสดงผลและมี interaction พื้นฐาน"],
        ["ผลตรวจ", "Django check ผ่าน, frontend build ผ่าน, lint ไม่ผ่าน 2 จุด, test ยังไม่มีกรณีทดสอบ"],
    ], [42 * mm, 140 * mm]),
    Spacer(1, 8 * mm),
    p("ข้อสรุปสำหรับผู้พัฒนา", "ThaiH1"),
    p("งานที่เห็นผลเป็นรูปธรรมที่สุดอยู่ที่ UI dashboard: แสดงสรุปรายรับ รายจ่าย ยอดคงเหลือ การเลือกเดือน checklist ข่าวสาร และเมนูทางลัดได้แล้ว อย่างไรก็ตามข้อมูลยังเป็นค่าคงที่หรือ state ใน browser จึงยังไม่ใช่ระบบการเงินที่บันทึกข้อมูลจริงได้", "ThaiBody"),
    p("ฝั่ง Django ผ่านการตรวจโครงสร้างและมี migration ของ transactions แล้ว แต่ยังทำหน้าที่เป็นโครงเริ่มต้นเป็นหลัก ยังไม่มี endpoint, serializer, authentication, CRUD หรือการเชื่อมต่อจาก React", "ThaiBody"),
    PageBreak(),
]

story += [p("1. รายการไฟล์ระดับโปรเจกต์", "ThaiH1")]
story += [table([
    ["ไฟล์", "สิ่งที่ทำแล้ว / ผลลัพธ์", "สถานะ"],
    ["README.md", "คู่มือ clone, venv, dependency, env, migrate และรันสองฝั่ง", "มีเอกสาร แต่ยังอ้าง .env.example ที่ไม่พบ และใช้ชื่อโฟลเดอร์ไม่ตรงตัวพิมพ์"],
    ["calendar_date_picker.html", "date picker standalone รองรับเดือนและปี พ.ศ.", "ทำงานแยกเดี่ยว ยังไม่เชื่อม React/Django"],
    [".gitignore / .gitattributes", "กันไฟล์ลับ/cache และกำหนดการจัดการไฟล์ข้อความ", "พร้อมใช้งาน"],
], [43 * mm, 78 * mm, 61 * mm])]

story += [p("2. Backend: Django", "ThaiH1")]
story += [table([
    ["ไฟล์/กลุ่มไฟล์", "สิ่งที่มีอยู่", "ผลลัพธ์ / สิ่งที่ยังขาด"],
    ["Backend/manage.py", "จุดเริ่มคำสั่ง Django", "ใช้งานคำสั่ง check, test, migrate ได้"],
    ["Backend/config/settings.py", "โหลด .env, ตั้งค่า apps, PostgreSQL, static files", "DEBUG=True, ALLOWED_HOSTS ว่าง, ยังไม่ได้ลงทะเบียน budgets/debts และใช้ MAILERS แทน EMAIL_BACKEND"],
    ["Backend/config/urls.py", "มี route admin/ เท่านั้น", "ยังไม่มี route ของแอปหรือ API"],
    ["Backend/config/asgi.py / wsgi.py", "entry point สำหรับ server", "โครงสร้างพร้อม แต่ไม่มี business logic"],
    ["Backend/transactions/models.py", "Transaction: amount, description, date", "ยังขาด owner/user, type income/expense, category, timestamps และ validation"],
    ["Backend/transactions/migrations/0001_initial.py", "สร้างตาราง Transaction", "สถานะ migration ถูก apply แล้วจาก showmigrations"],
    ["Backend/transactions/views.py / admin.py / tests.py", "เป็น scaffold ว่าง", "ยังไม่มี endpoint, admin registration หรือ test"],
    ["Backend/users/*", "มี app config และไฟล์ scaffold", "ยังไม่มี user/profile/authentication model หรือ view"],
    ["Backend/budgets/*", "มี app config และไฟล์ scaffold", "ยังไม่มี model, migration, view, admin หรือ test และยังไม่อยู่ใน INSTALLED_APPS"],
    ["Backend/debts/*", "มี app config และไฟล์ scaffold", "ยังไม่มี model, migration, view, admin หรือ test และยังไม่อยู่ใน INSTALLED_APPS"],
    ["Backend/requirements.txt", "Django, DRF, psycopg, dotenv และ dependencies", "มี DRF แต่ยังไม่ได้สร้างส่วน API ของ DRF"],
], [48 * mm, 65 * mm, 69 * mm])]

story += [PageBreak(), p("3. Frontend: React/Vite", "ThaiH1")]
story += [table([
    ["ไฟล์", "สิ่งที่ทำแล้ว / ผลลัพธ์", "สถานะ"],
    ["Frontend/src/FinaceHome.jsx", "dashboard หลัก: สรุปเงิน, เลือกเดือน, checklist, หนี้, เงินออม, ข่าวสาร, FAB และ responsive layout", "แสดงผลได้ แต่ข้อมูล mock; ปุ่มจำนวนมากยังไม่มี action/persistence/API"],
    ["Frontend/src/main.jsx", "mount FinaceHome เข้า root", "ทำงาน แต่ import StrictMode ไม่ได้ใช้ ทำให้ lint error"],
    ["Frontend/src/App.jsx", "หน้า template counter ของ Vite", "ไม่ได้ถูกใช้งานโดย main.jsx ควรลบหรือปรับให้เป็นหน้าจริง"],
    ["Frontend/src/App.css / index.css", "CSS ของ Vite template และ global styles", "ส่วนใหญ่ไม่ใช่ styling หลักของ FinanceHome ซึ่งใช้ inline style"],
    ["Frontend/index.html", "entry point ของ Vite", "title ยังเป็น frontend และอ้าง favicon ที่ควรตรวจให้ตรงกับ public"],
    ["Frontend/vite.config.js / eslint.config.js", "ตั้งค่า Vite + React plugin และ ESLint", "ใช้งานได้; lint ตรวจพบ unused imports 2 จุด"],
    ["Frontend/package.json / package-lock.json", "scripts dev, build, lint, preview และ dependencies", "package-lock.json มีการแก้ไขค้างอยู่ก่อนจัดทำรายงาน"],
    ["Frontend/public/* และ src/assets/*", "favicon/icons และ assets จาก template", "ยังมี asset ของ React/Vite ที่ไม่ได้เป็นส่วนของผลิตภัณฑ์หลัก"],
], [48 * mm, 67 * mm, 67 * mm])]

story += [p("4. ผลการตรวจสอบที่รันจริง", "ThaiH1")]
story += [table([
    ["คำสั่ง", "ผลลัพธ์", "ความหมาย"],
    ["python Backend/manage.py check", "ผ่าน: no issues", "โครงสร้างและ settings ขั้นต้นของ Django ไม่พบปัญหา"],
    ["python Backend/manage.py showmigrations", "transactions 0001 และ migrations หลักของ Django เป็น [X]", "migration ที่มีอยู่ถูก apply แล้วในฐานข้อมูลที่ settings ชี้ไป"],
    ["python Backend/manage.py test", "ผ่านกระบวนการ แต่ Found 0 test(s)", "ยังไม่มี test case จริง จึงยังไม่ได้ยืนยัน behavior"],
    ["cd Frontend; npm run build", "ผ่าน: Vite 8.2.1, bundle สร้างสำเร็จ", "frontend สามารถ build เป็น production bundle ได้"],
    ["cd Frontend; npm run lint", "ไม่ผ่าน 2 errors", "FinaceHome.jsx import React ไม่ใช้ และ main.jsx import StrictMode ไม่ใช้"],
], [58 * mm, 54 * mm, 70 * mm])]

story += [PageBreak(), p("5. สิ่งที่ควรทำต่อ", "ThaiH1")]
story += [table([
    ["ลำดับ", "งานถัดไป", "ผลลัพธ์ที่ควรได้"],
    ["1", "แก้ lint โดยลบ import ที่ไม่ได้ใช้ และรัน lint ซ้ำ", "คุณภาพ frontend ผ่านการตรวจพื้นฐาน"],
    ["2", "กำหนด domain model ให้ครบ: user, category, transaction type, budget, debt, saving", "โครงสร้างข้อมูลรองรับความต้องการของ dashboard"],
    ["3", "ลงทะเบียน apps และสร้าง migrations ของ budgets/debts ตาม model", "ฐานข้อมูลรองรับฟีเจอร์หลัก"],
    ["4", "สร้าง DRF serializers, views และ URLs พร้อม authentication/permission", "มี API สำหรับข้อมูลจริงและแยกข้อมูลตามผู้ใช้"],
    ["5", "เปลี่ยน FinanceHome ให้ fetch API และจัดการ loading/error/empty states", "dashboard แสดงข้อมูลจาก backend แทน mock"],
    ["6", "เพิ่ม CRUD และบันทึกข้อมูลจริง รวมถึง validation", "ผู้ใช้สร้าง/แก้ไข/ลบรายการได้"],
    ["7", "เพิ่ม test ของ model/API และทดสอบ flow สำคัญของ frontend", "ลดความเสี่ยง regression"],
    ["8", "ปรับ README ให้ตรงกับโครงสร้างจริง และสร้าง .env.example ที่ไม่มี secret", "เริ่มต้นโปรเจกต์ได้ถูกต้องสำหรับสมาชิกทีม"],
    ["9", "แยกค่า production เช่น DEBUG, ALLOWED_HOSTS, email และ CORS", "พร้อมยกระดับจาก prototype ไปสู่ deployment"],
], [14 * mm, 83 * mm, 85 * mm])]

story += [Spacer(1, 8 * mm), p("หมายเหตุด้านความปลอดภัย", "ThaiH2"), p("รายงานฉบับนี้ไม่แสดงค่าจริงจาก Backend/.env เพื่อป้องกันการเปิดเผย secret หรือข้อมูลเชื่อมต่อฐานข้อมูล ควรเก็บไฟล์ดังกล่าวไว้นอก Git และจัดทำไฟล์ตัวอย่างสำหรับทีมแทน", "ThaiBody")]

doc = SimpleDocTemplate(
    str(OUTPUT), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm,
    topMargin=15 * mm, bottomMargin=16 * mm, title="Financial-App Progress Report",
    author="GitHub Copilot",
)
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUTPUT)
