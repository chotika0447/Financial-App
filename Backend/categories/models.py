from django.db import models


class Category(models.Model):

    # NULL = หมวดหมู่กลางที่ทุกคนใช้งานได้
    # มี user = หมวดหมู่ส่วนตัวของผู้ใช้นั้น
    user = models.ForeignKey(
        "users.User", on_delete=models.CASCADE, null=True, blank=True,
        related_name="custom_categories"
    )

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

class Brand(models.Model):
    """Shared keyword -> global category mapping."""
    keyword = models.CharField(max_length=150)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="brands", limit_choices_to={"user__isnull": True})
    transaction_type = models.CharField(max_length=10, choices=Category.TransactionType.choices)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["keyword", "transaction_type"], name="unique_brand_keyword_type")]

    def __str__(self):
        return f"{self.keyword} → {self.category.name}"


class UserKeyword(models.Model):
    """Keywords explicitly configured for a single user's categories."""
    user = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="category_keywords")
    keyword = models.CharField(max_length=150)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="user_keywords")
    transaction_type = models.CharField(max_length=10, choices=Category.TransactionType.choices)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "keyword", "transaction_type"], name="unique_user_keyword_type")]

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.category_id:
            if self.category.user_id not in (None, self.user_id):
                raise ValidationError("Cannot use another user's category")
            if self.category.transaction_type != self.transaction_type:
                raise ValidationError("Category type mismatch")

    def save(self, *args, **kwargs):
        self.keyword = self.keyword.strip().casefold()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user_id}: {self.keyword} → {self.category.name}"
