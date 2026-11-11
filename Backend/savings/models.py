from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from django.utils import timezone

from decimal import Decimal

from users.models import User

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
    #วันที่สิ้นสุดเป้าหมาย
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

#ตารางบันทึกประวัติการทำรายการฝากถอนเงิน
class SavingsTransaction(models.Model):

    class TransactionType(models.TextChoices):
        DEPOSIT = 'deposit', 'ฝากเงิน'
        WITHDRAW = 'withdraw', 'ถอนเงิน'

    transaction_id = models.BigAutoField(primary_key=True)

    # กระเป๋าที่ทำรายการ
    # ใช้ SET_NULL เพื่อเก็บประวัติไว้ แม้ผู้ใช้ลบกระเป๋าแล้ว
    saving = models.ForeignKey(
        'savings.Savings',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions'
    )

    # เจ้าของรายการ
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="saving_transactions"
    )

    # เก็บชื่อกระเป๋า ณ เวลาที่ทำรายการ
    # เพื่อให้ยังแสดงประวัติได้เมื่อกระเป๋าถูกลบ
    saving_name = models.CharField(
        max_length=100,
        blank=True,
        default=''
    )

    transaction_type = models.CharField(
        max_length=10,
        choices=TransactionType.choices
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )

    # วันที่เกิดรายการ
    transaction_date = models.DateField(
        default=timezone.localdate
    )

    # ยอดเงินคงเหลือหลังทำรายการ
    balance_after = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )

    note = models.TextField(
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        db_table = 'savings_transaction'
        ordering = ['-transaction_date', '-created_at']
        indexes = [
            models.Index(
                fields=['user', 'transaction_date'],
                name='saving_user_date_idx'
            ),
            models.Index(
                fields=['saving', 'transaction_date'],
                name='saving_wallet_date_idx'
            ),
        ]

    def __str__(self):
        return (
            f'{self.get_transaction_type_display()} '
            f'{self.amount} บาท - {self.saving_name}'
        )