import os
from celery import Celery

# ระบุไฟล์ Settings ของ Django
os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "config.settings"
)

# สร้าง Celery Application
app = Celery("config")

# โหลดการตั้งค่าจาก Django settings.py
app.config_from_object(
    "django.conf:settings",
    namespace="CELERY"
)

# ค้นหา Task จากแอป Django
app.autodiscover_tasks()

# โหลด Task ที่เราเขียนไว้ใน line_bot/views.py
app.conf.imports = ("line_bot.views",)