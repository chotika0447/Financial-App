from django.db import models
from django.conf import settings

# Create your models here.

class Transaction(models.Model) :
    # ผู้ใช้ที่เป็นจำของรายการใช้จ่าย
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    # ประเภทของรายการ : รายรับ (Income) หรือ รายจ่าย (Expense)
    transaction_type = models.CharField(max_length=10, choices=[('income', 'Income'), ('expense', 'Expense')])
    # หมวดหมู่การทำรายการ รายรับ - รายจ่าย เช่น อาหาร เดินทาง เงินเดือน
    category = models.CharField(max_length=100)
    # จำนวนเงินที่ใช้จ่ายหรือได้รับ
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    # รายละเอียดเพิ่มเติมเกี่ยวกับการทำรายการ เช่น ชื่อร้านค้า หรือเหตุผลในการใช้จ่าย
    description = models.CharField(max_length=255)
    # วันที่และเวลาที่ทำรายการ
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.description} - {self.amount}"