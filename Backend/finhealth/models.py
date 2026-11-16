from django.db import models
from users.models import User


class FinHealth(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="financial_health_reports"
    )

    # เชื่อมผลคะแนนกับรอบการเงิน
    financial_period = models.OneToOneField(
        "FinancialPeriod",  # เพิ่มเครื่องหมายคำพูดตรงนี้
        on_delete=models.PROTECT,
        related_name="health_report",
        null=True,
        blank=True
    )

    report_month = models.PositiveSmallIntegerField()
    report_year = models.PositiveSmallIntegerField()

    spend_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True
    )

    save_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True
    )

    debt_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True
    )

    score_details = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    line_sent = models.BooleanField(default=False)
    line_sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "report_month", "report_year"],
                name="unique_financial_health_monthly_report"
            )
        ]


class FinancialPeriod(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="financial_periods"
    )

    start_date = models.DateField()
    end_date = models.DateField()

    # ระบุว่าเป็นรอบเปลี่ยนผ่านหรือไม่
    is_transition = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_date"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "start_date"],
                name="unique_user_financial_period_start"
            )
        ]

    def __str__(self):
        return f"{self.user} | {self.start_date} - {self.end_date}"


class FinancialCycleSetting(models.Model):
    user = models.OneToOneField(
        "users.User",
        on_delete=models.CASCADE,
        related_name="financial_cycle_setting"
    )

    start_day = models.PositiveSmallIntegerField(default=1)

    # วันที่เริ่มใช้การตั้งค่าใหม่
    effective_from = models.DateField(null=True, blank=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user} - Start day {self.start_day}"
