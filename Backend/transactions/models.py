from django.db import models

from users.models import User


class Transaction(models.Model):

    class TransactionType(models.TextChoices):
        INCOME = "income", "Income"
        EXPENSE = "expense", "Expense"


    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="transactions"
    )


    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )


    transaction_type = models.CharField(
        max_length=10,
        choices=TransactionType.choices
    )


    description = models.TextField(
        blank=True
    )


    transaction_date = models.DateField()


    # เชื่อม Transaction กับ Category
    category = models.ForeignKey(
        "categories.Category",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )


    # ตอนนี้ยังเก็บเป็นข้อความก่อน
    sub_category = models.CharField(
        max_length=100,
        blank=True
    )


    # เช่น เงินสด กสิกร กรุงไทย
    account = models.CharField(
        max_length=100,
        blank=True
    )


    transaction_time = models.TimeField(
        null=True,
        blank=True
    )


    # รูปใบเสร็จ / หลักฐานการทำรายการ
    receipt = models.ImageField(
        upload_to="receipts/",
        null=True,
        blank=True
    )


    created_at = models.DateTimeField(
        auto_now_add=True
    )


    def __str__(self):
        return f"{self.transaction_type} - {self.amount}"