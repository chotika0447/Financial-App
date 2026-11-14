
from django.db import models
from django.core.exceptions import ValidationError


class Category(models.Model):
    # NULL = หมวดหมู่กลางที่ทุกคนใช้งานได้
    # ยังเก็บ Field นี้ไว้เพื่อไม่กระทบ Schema เดิม
    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="custom_categories"
    )

    class TransactionType(models.TextChoices):
        INCOME = "income", "Income"
        EXPENSE = "expense", "Expense"

    name = models.CharField(max_length=100)

    transaction_type = models.CharField(
        max_length=10,
        choices=TransactionType.choices
    )

    def __str__(self):
        return self.name


class Brand(models.Model):
    """Shared keyword -> global category mapping."""

    keyword = models.CharField(max_length=150)

    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="brands",
        limit_choices_to={"user__isnull": True}
    )

    transaction_type = models.CharField(
        max_length=10,
        choices=Category.TransactionType.choices
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["keyword", "transaction_type"],
                name="unique_brand_keyword_type"
            )
        ]

    def clean(self):
        super().clean()

        if not self.category_id:
            return

        # Brand ต้องอ้างอิงหมวดหมู่ส่วนกลางเท่านั้น
        if self.category.user_id is not None:
            raise ValidationError({
                "category": "ต้องเลือกหมวดหมู่ส่วนกลางเท่านั้น"
            })

        # ประเภทของ Brand และ Category ต้องตรงกัน
        if self.category.transaction_type != self.transaction_type:
            raise ValidationError({
                "category": "ประเภทของ Brand และหมวดหมู่ต้องตรงกัน"
            })

    def __str__(self):
        return f"{self.keyword} → {self.category.name}"
