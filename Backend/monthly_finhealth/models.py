from django.test import TestCase

# Create your tests here.
class MonthlyFinHealth(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="financial_health_reports"
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

    # เก็บรายละเอียดคะแนนและข้อมูลประกอบของแต่ละตัวชี้วัด
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