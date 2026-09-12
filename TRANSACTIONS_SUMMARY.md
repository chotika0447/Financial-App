# Transactions Summary

เอกสารนี้สรุปการทำงานของส่วน `transactions` ใน Backend ของ Financial-App

## ภาพรวม

ส่วน `transactions` ใช้สำหรับบันทึกรายรับและรายจ่ายของผู้ใช้แต่ละคน โดยพัฒนาด้วย Django REST Framework และเปิดใช้งานแบบ CRUD API

ข้อมูลของแต่ละผู้ใช้จะถูกแยกออกจากกัน ผู้ใช้ที่ล็อกอินอยู่จะเห็นและจัดการได้เฉพาะรายการของตนเองเท่านั้น

## โครงสร้างไฟล์

- `Backend/transactions/models.py` - กำหนดโครงสร้างตาราง Transaction
- `Backend/transactions/serializers.py` - แปลงข้อมูลระหว่าง Model และ JSON
- `Backend/transactions/views.py` - ควบคุมการทำงานของ CRUD API
- `Backend/transactions/urls.py` - ลงทะเบียน route ด้วย DRF Router
- `Backend/transactions/migrations/0001_initial.py` - migration สำหรับสร้างตาราง

## ข้อมูล Transaction

| Field | ประเภท | รายละเอียด |
|---|---|---|
| `id` | Integer | รหัสรายการ สร้างอัตโนมัติ และแก้ไขไม่ได้ |
| `user` | Foreign Key | ผู้เป็นเจ้าของรายการ ระบบกำหนดจากผู้ใช้ที่ล็อกอิน และแก้ไขไม่ได้ |
| `type` | String | ประเภทรายการ: `income` หรือ `expense` |
| `category` | String | หมวดหมู่ของรายการ ค่าเริ่มต้นคือ `other` |
| `amount` | Decimal | จำนวนเงิน ทศนิยม 2 ตำแหน่ง รองรับสูงสุด 12 หลัก |
| `description` | Text | รายละเอียดเพิ่มเติม ไม่บังคับกรอก |
| `date` | Date | วันที่เกิดรายการ |
| `created_at` | DateTime | วันที่และเวลาที่สร้างรายการ ระบบกำหนดอัตโนมัติ |

### ตัวเลือกของ `category`

- `food` - อาหาร
- `transport` - การเดินทาง
- `shopping` - การซื้อของ
- `bills` - ค่าใช้จ่ายประจำ/บิล
- `salary` - เงินเดือน
- `other` - อื่น ๆ

## API Endpoint

URL หลักของ API คือ `/api/transactions/`

| Method | Endpoint | การทำงาน |
|---|---|---|
| `GET` | `/api/transactions/` | ดูรายการ Transaction ของผู้ใช้ปัจจุบันทั้งหมด |
| `POST` | `/api/transactions/` | สร้าง Transaction ใหม่ |
| `GET` | `/api/transactions/{id}/` | ดูรายละเอียดรายการหนึ่งรายการ |
| `PUT` | `/api/transactions/{id}/` | แก้ไขข้อมูลทั้งรายการ |
| `PATCH` | `/api/transactions/{id}/` | แก้ไขข้อมูลบางส่วน |
| `DELETE` | `/api/transactions/{id}/` | ลบรายการ |

รายการที่ได้จาก `GET` จะเรียงจากวันที่ล่าสุดไปเก่าสุด และถ้าวันที่เท่ากันจะเรียงตาม `id` ล่าสุดก่อน

## การยืนยันตัวตนและความปลอดภัย

- ทุก endpoint ต้องผ่านการยืนยันตัวตนด้วย `IsAuthenticated`
- ผู้ใช้ที่ไม่ได้ล็อกอินจะไม่สามารถเรียกใช้งาน API ได้
- ตอนสร้างรายการ ระบบจะกำหนด `user` จาก `request.user` โดยอัตโนมัติ
- ตอนอ่าน แก้ไข หรือลบ ระบบจะค้นหาเฉพาะรายการที่เป็นของผู้ใช้ปัจจุบัน
- ไม่ควรส่งค่า `user` จากฝั่ง Frontend เพราะ field นี้เป็น read-only

## ตัวอย่างการสร้างรายการ

```http
POST /api/transactions/
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "type": "expense",
  "category": "food",
  "amount": "120.50",
  "description": "มื้อกลางวัน",
  "date": "2026-09-08"
}
```

ตัวอย่าง response:

```json
{
  "id": 1,
  "user": 2,
  "type": "expense",
  "category": "food",
  "amount": "120.50",
  "description": "มื้อกลางวัน",
  "date": "2026-09-08"
}
```

## การเชื่อม URL

ใน `Backend/config/urls.py` มีการเชื่อม route ดังนี้:

```python
path('api/', include('transactions.urls'))
```

และใน `Backend/transactions/urls.py` ใช้ `DefaultRouter` ลงทะเบียน `TransactionViewSet` ด้วย route ชื่อ `transactions`

## สรุปการทำงาน

1. ผู้ใช้ล็อกอินและได้รับ access token
2. Frontend ส่ง token ไปกับ request ทุกครั้ง
3. Backend ตรวจสอบว่าเป็นผู้ใช้ที่ล็อกอินอยู่
4. เมื่อสร้างรายการ Backend ผูก Transaction เข้ากับผู้ใช้อัตโนมัติ
5. การแสดงผล แก้ไข และลบจะทำได้เฉพาะรายการของผู้ใช้นั้น
