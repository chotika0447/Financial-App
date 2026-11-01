from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("categories", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations = [
        migrations.AddField(
            model_name="category",
            name="user",
            field=models.ForeignKey(blank=True, null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="custom_categories", to=settings.AUTH_USER_MODEL),
        ),
    ]
