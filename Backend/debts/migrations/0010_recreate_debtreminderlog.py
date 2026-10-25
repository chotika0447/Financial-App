from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("debts", "0009_debts_reminder_days_before_debts_reminder_repeat_and_more"),
    ]

    operations = [
        migrations.DeleteModel(
            name="DebtReminderLog",
        ),
        migrations.CreateModel(
            name="DebtReminderLog",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("due_date", models.DateField()),
                ("reminder_date", models.DateField()),
                ("sent_at", models.DateTimeField(auto_now_add=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("sent", "ส่งสำเร็จ"),
                            ("failed", "ส่งไม่สำเร็จ"),
                        ],
                        default="sent",
                        max_length=20,
                    ),
                ),
                (
                    "error_message",
                    models.TextField(blank=True, default=""),
                ),
                (
                    "debt",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="reminder_logs",
                        to="debts.debts",
                    ),
                ),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(
                        fields=("debt", "due_date", "reminder_date"),
                        name="unique_debt_reminder_due_date",
                    ),
                ],
            },
        ),
    ]