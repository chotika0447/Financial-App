from django.db import models
from users.models import User
from django.core.validators import MaxValueValidator

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

    id = models.AutoField(
        primary_key=True
    )
    # ชื่อรายการ
    name = models.CharField(
        max_length=100
    )
    # ผู้ใช้ที่ทำรายการ
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='debts'
    )

    #ข้อมูลบัญชีของเพื่อน *สามารถเป็น NULL ได้
    counterparty = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='debts_counterparty'
    )
    
    # ชื่อคนที่เกี่ยวข้องกับหนี้/คู่สัญญา
    counterparty_name = models.CharField(
        max_length=100
    )

    # รายการหนี้คู่กันของผู้ใช้ทั้งสองฝั่ง กรณีที่มีการเชื่อมบัญชีเพื่อน เพื่อสร้างหน้ารายการหนี้สิน/ให้ยืมให้ตรงกัน
    paired_debt = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="paired_debts",
    )

    # เราเป็นคนยืม หรือเป็นคนให้ยืม
    type = models.CharField(
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
    #ทยอยชำระ/รายเดือน
    payment_type = models.CharField(
        max_length=20,
        choices=PAYMENT_TYPE_CHOICES
    )
    
    # จำนวนเงินที่ต้องจ่ายรายเดือนจะแบ่งงวดเท่าๆกัน
    # แต่ถ้า payment_type = ทยอยชำระ จะเป็น NULL
    payment_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )

    # วันครบกำหนดสุดท้ายในการชำระหนี้ก้อนนี้
    due_date = models.DateField()
    # วันครบกำหนดชำระเงินในแต่ละเดือน (สำหรับ monthly)
    payment_date = models.PositiveSmallIntegerField(
        null=True,
        blank=True
    )
    # วันครบกำหนดของงวดปัจจุบัน สำหรับ monthly เท่านั้น ส่วน flexible ปล่อยเป็น NULL
    current_due_date = models.DateField(
        null=True,
        blank=True
    )
    #เปิด-ปิดการแจ้งเตือน
    reminder_enabled = models.BooleanField(default=False)

    # จำนวนวันแจ้งเตือนก่อนถึงกำหนดชำระ
    reminder_days_before = models.PositiveSmallIntegerField(
        default=3,
        validators=[MaxValueValidator(28)],
    )

    # เวลาแจ้งเตือนตามเวลาไทย
    reminder_time = models.TimeField( default="09:00")

    # True = แจ้งทุกวัน, False = แจ้งครั้งเดียวในวันเริ่มเตือน
    reminder_repeat = models.BooleanField(default=False)

    #สถานะว่าปิดหนี้ก้อนนี้ไปรึยัง
    status = models.CharField(
        max_length=20,
        choices=DEBT_STATUS_CHOICES,
        default='ongoing'
    )
    
    note = models.TextField(
        blank=True
    )

    # ไอคอนของรายการหนี้
    icon = models.CharField(
        max_length=30,
        default='school'
    )

    # สีพื้นหลังไอคอน
    color = models.CharField(
        max_length=30,
        default='purple'
    )

    image = models.URLField(
        max_length=500,
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.name} - {self.counterparty_name}"


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
    #รหัสหนี้สิน
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
    # วันที่จ่ายจริง
    paid_date = models.DateField(
        null=True,
        blank=True
    )
    
    proof_image = models.URLField(
        max_length=500,
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
    rejection_reason = models.TextField(
        blank=True,
        default="",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return (
            f"{self.debt.name} - "
            f"{self.paid_amount} บาท - "
            f"{self.paid_date or self.due_date}"
        )


# Model บันทึกประวัติการแจ้งเตือน เอาไว้ป้องกันไม่ให้ระบบส่งข้อความซ้ำจากการตรวจสอบรอบเดิมหลายครั้ง
class DebtReminderLog(models.Model):
    debt = models.ForeignKey(
        "debts.Debts",
        on_delete=models.CASCADE,
        related_name="reminder_logs",
    )

    # ระบุว่างวดที่แจ้งเตือนเป็นงวดไหน
    due_date = models.DateField()

    # วันที่ส่งแจ้งเตือน เพื่อป้องกันการส่งซ้ำในวันเดียวกัน
    reminder_date = models.DateField()

    sent_at = models.DateTimeField(auto_now_add=True)

    status = models.CharField(
        max_length=20,
        choices=[
            ("sent", "ส่งสำเร็จ"),
            ("failed", "ส่งไม่สำเร็จ"),
        ],
        default="sent",
    )

    error_message = models.TextField(
        blank=True,
        default="",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["debt", "due_date", "reminder_date"],
                name="unique_debt_reminder_due_date",
            )
        ]

    def __str__(self):
        return (
            f"Debt {self.debt_id} - "
            f"Due {self.due_date} - "
            f"Reminder {self.reminder_date}"
        )