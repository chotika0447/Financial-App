from django.db import models


class Category(models.Model):

    class TransactionType(models.TextChoices):
        INCOME = "income", "Income"
        EXPENSE = "expense", "Expense"

    name = models.CharField(
        max_length=100
    )

    transaction_type = models.CharField(
        max_length=10,
        choices=TransactionType.choices
    )

    def __str__(self):
        return self.name