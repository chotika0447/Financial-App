from .celery import app as celery_app

#ตั้งค่าให้ Django สามารถโหลด Celery Application ได้
__all__ = ("celery_app",)