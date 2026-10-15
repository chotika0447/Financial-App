from django.db import models
from users.models import User

# Create your models here.

class Savings(models.Model):

    saving_id = models.BigAutoField(
        primary_key=True
    )
    #ผู้ใช้
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE, #ถ้าผู้ใช้ถูกลบ ข้อมูลการออมของผู้ใช้ก็จะถูกลบด้วย
        related_name="savings"
    )
    #ชื่อกระเป๋า
    saving_name = models.CharField(
        max_length=30,
        blank=True
    )
    #จำนวนเงินคงเหลือ
    balance = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0.00
    )
    #วันที่สร้าง
    created_at = models.DateTimeField(
        auto_now_add=True
    )
    #วันที่แก้ไขล่าสุด
    updated_at = models.DateTimeField(
        auto_now=True
    )
    #จำนวนเงินเป้าหมาย
    target = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0.00
    )
    #วันที่กสิ้นสุดเป้าหมาย
    target_date = models.DateField(
        null=True,
        blank=True
    )

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed')
    ]
     #สถานะ
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="active"
    )
    #วันที่เริ่มการออม
    start_date = models.DateField(
        null=True,
        blank=True
    )
    #วันที่สิ้นสุดการออม
    end_date = models.DateField(
        null=True,
        blank=True
    )

    def __str__(self):
        return f"Savings {self.saving_id} for User {self.user.uid}"
