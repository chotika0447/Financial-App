from django.conf import settings
from django.db import models


class Transaction(models.Model):

    TYPE_CHOICES = [
        ('Income', 'Income'),
        ('Expense', 'Expense'),
        ('income', 'Income'),
        ('expense', 'Expense'),
    ]

    id = models.BigAutoField(primary_key=True)
    amount = models.DecimalField(
        max_digits=12, decimal_places=2, db_column='amount'
    )
    transaction_type = models.CharField(
        max_length=10, choices=TYPE_CHOICES, db_column='transaction_type'
    )
    description = models.TextField(blank=True, db_column='description')
    transaction_date = models.DateField(db_column='transaction_date')
    created_at = models.DateTimeField(
        auto_now_add=True, null=True, blank=True, db_column='created_at'
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='transactions',
        db_column='user_id',
    )

    category_id = models.IntegerField(
        null=True, blank=True, db_column='category_id'
    )
    transaction_time = models.TimeField(
        null=True, blank=True, db_column='transaction_time'
    )
    receipt = models.TextField(null=True, blank=True, db_column='receipt')

    class Meta:
        db_table = 'transactions_transaction'