from django.db import models
from users.models import User


class Debts(models.Model):

    DEBT_STATUS_CHOICES = [
        ('ongoing', 'ดำเนินการอยู่'),
        ('paid', 'ชำระแล้ว'),
    ]

    DEBT_TYPE_CHOICES = [
        ('borrowed', 'ยืมเงิน'),
        ('lent', 'ให้ยืมเงิน'),
    ]

    PAYMENT_TYPE_CHOICES = [
        ('flexible', 'ทยอยชำระ'),
        ('monthly', 'รายเดือน'),
    ]

    debt_id = models.AutoField(
        primary_key=True
    )

    debt_name = models.CharField(
        max_length=100
    )

    uid = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='debts'
    )

    # ถ้าเป็น User ในระบบ จะเก็บ User ไว้ตรงนี้
    # ถ้าเป็นคนนอกระบบ จะเป็น NULL
    counterparty_uid = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='debts_counterparty'
    )

    # ชื่อคนที่เกี่ยวข้องกับหนี้
    counterparty_name = models.CharField(
        max_length=100
    )

    # เราเป็นคนยืม หรือเป็นคนให้ยืม
    debt_type = models.CharField(
        max_length=10,
        choices=DEBT_TYPE_CHOICES
    )

    # จำนวนหนี้ทั้งหมด
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    # ยอดหนี้คงเหลือ
    remaining_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    payment_type = models.CharField(
        max_length=20,
        choices=PAYMENT_TYPE_CHOICES
    )
    
    # จำนวนเงินที่ต้องจ่ายในแต่ละงวด
    # กรณี flexible สามารถเป็น NULL ได้
    payment_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )

    # วันครบกำหนด(สำหรับ flexible) 
    due_date = models.DateField()
    # วันครบกำหนดชำระเงินในแต่ละเดือน (สำหรับ monthly)
    payment_day = models.PositiveSmallIntegerField(
        null=True,
        blank=True
    )

    status = models.CharField(
        max_length=20,
        choices=DEBT_STATUS_CHOICES,
        default='ongoing'
    )
   
    note = models.TextField(
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.debt_name} - {self.counterparty_name}"


class Payments(models.Model):
    #สถานะการชำระเงินของลูกหนี้
    PAYMENT_STATUS = [
        ('pending', 'รอชำระ'),
        ('partial', 'ชำระบางส่วน'),
        ('paid', 'ชำระแล้ว'),
        ('overdue', 'เกินกำหนด'),
    ]
    #สถานะการยืนยันการชำระเงินของเจ้าหนี้
    CONFIRM_STATUS = [
        ('pending', 'รอตรวจสอบ'),
        ('confirmed', 'ยืนยันแล้ว'),
        ('rejected', 'ไม่ผ่านการตรวจสอบ'),
    ]

    debt = models.ForeignKey(
        Debts,
        on_delete=models.CASCADE,
        related_name='payments'
    )

    # จำนวนเงินที่ต้องจ่ายในงวดนั้น
    scheduled_amount  = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True, #สำหรับ flexible สามารถเป็น NULL ได้
        blank=True
    )
    # จำนวนเงินที่จ่ายจริงในงวดนั้น
    paid_amount  = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )

    # วันครบกำหนดของงวด
    due_date = models.DateField()
    # วันที่จ่าย
    payment_date = models.DateField(
        null=True,
        blank=True
    )
    
    proof_image = models.ImageField(
        upload_to='payment_proofs/',
        null=True,
        blank=True
    )

    note = models.TextField(
        blank=True
    )
    
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS,
        default='pending'
    )
    confirm_status = models.CharField(
        max_length=20,
        choices=CONFIRM_STATUS,
        default='pending'
    )
    created_at = models.DateTimeField(
            auto_now_add=True
        )
    
    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.debt.debt_name} - {self.paid_amount} บาท - {self.payment_date}"