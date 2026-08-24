from django.db import models
from users.models import User


class Transaction(models.Model):

    class TransactionType(models.TextChoices):
        INCOME = 'income', 'Income'
        EXPENSE = 'expense', 'Expense'

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='transactions'
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    transaction_type = models.CharField(
        max_length=10,
        choices=TransactionType.choices
    )

    description = models.CharField(
        max_length=255
    )

    transaction_date = models.DateField()

    created_at = models.DateTimeField(
        auto_now_add=True
    )