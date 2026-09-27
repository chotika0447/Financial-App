from django.db import models
from users.models import User


class Friends(models.Model):

    STATUS_CHOICES = [
        ('pending', 'รอการตอบรับ'),
        ('accepted', 'เป็นเพื่อน'),
        ('rejected', 'ปฏิเสธ'),
    ]

    requester = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sender_friend_requests'
    )

    receiver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='receiver_friend_requests'
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"{self.requester} → {self.receiver}"