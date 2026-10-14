from django.db import models
from users.models import User


class LineRecordMode(models.Model):

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE
    )

    transaction_type = models.CharField(
        max_length=10,
        choices=[
            ("income", "รายรับ"),
            ("expense", "รายจ่าย"),
        ]
    )
