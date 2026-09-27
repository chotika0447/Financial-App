from django.db import models
from users.models import User
from debts.models import Debts, Payments
from friends.models import Friends


class Notification(models.Model):

    TYPE_CHOICES = [
        ('friend_request', 'คำขอเป็นเพื่อน'),
        ('payment', 'การชำระหนี้'),
        ('debt_due', 'หนี้ใกล้ครบกำหนด'),
    ]
    friends = models.ForeignKey(
        Friends,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )
    debt = models.ForeignKey(
        Debts,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )
    payment = models.ForeignKey(
        Payments,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )
    #-------------------------------------------------------------
    notification_type = models.CharField(
        max_length=30,
        choices=TYPE_CHOICES
    )

    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications'
    )

    message = models.TextField()

    is_read = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"{self.recipient} - {self.message}"