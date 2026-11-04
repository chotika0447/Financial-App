from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("debts", "0012_payments_rejection_reason"),
    ]

    operations = [
        migrations.RenameField(
            model_name="payments",
            old_name="confirm_status",
            new_name="approvement_status",
        ),
        migrations.AlterField(
            model_name="payments",
            name="approvement_status",
            field=models.CharField(
                choices=[
                    ("pending", "รอตรวจสอบ"),
                    ("approved", "ยืนยันแล้ว"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
        migrations.RemoveField(
            model_name="payments",
            name="rejection_reason",
        ),
    ]
