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

    name = models.CharField(
        max_length=200,
        blank=True
    )

    description = models.TextField(blank=True)

    transaction_date = models.DateField()

    category = models.ForeignKey(
        "categories.Category",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    sub_category = models.CharField(
        max_length=100,
        blank=True
    )

    account = models.CharField(
        max_length=100,
        blank=True
    )

    transaction_time = models.TimeField(
        null=True,
        blank=True
    )

    receipt = models.ImageField(
        upload_to="receipts/",
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.transaction_type} - {self.amount}"