from django.db import models
from users.models import User


class Friends(models.Model):

    STATUS_CHOICES = [
        ('pending', 'รอการตอบรับ'),
        ('accepted', 'เป็นเพื่อน'),
        ('rejected', 'ปฏิเสธ'),
    ]

    sender = models.ForeignKey(
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

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    # กำหนดไม่ให้รายการซํ้ากัน 
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["sender", "receiver"],
                name="unique_friend_request"
            )
        ]

    def __str__(self):
        return f"{self.sender} → {self.receiver}"