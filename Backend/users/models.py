from django.db import models
import random

#
def generate_uid():
    return random.randint(1000000000, 9999999999)


class User(models.Model):

    uid = models.BigIntegerField(
        primary_key=True,
        default=generate_uid,
        editable=False,
    )

    line_uid = models.CharField(
        max_length=50,
        unique=True,
    )

    username = models.CharField(
        max_length=50,
        blank=True,
    )
    # สถานะที่แสดงว่าบัญชีผู้ใช้คนนี้ยัง เปิดใช้งานอยู่ หรือ ถูกระงับ ไม่ได้หมายถึง "กำลังออนไลน์"
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    def __str__(self):
        return self.username or str(self.uid)


#ตารางข้อมูลส่วนตัวของผู้ใช้ (Personal Profile) เชื่อมกับ User Model
class PersonalProfile(models.Model):
    
    profile_id = models.BigAutoField(
        primary_key=True
    )

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="personal_profile"
    )
    #เอาไว้ส่งแจ้งเตือน/สำรองข้อมูลบัญชี
    email = models.EmailField(
        null=True,
        blank=True
    )

    age = models.PositiveIntegerField(
        null=True,
        blank=True
    )

    occupation = models.CharField(
        max_length=100,
        null=True,
        blank=True
    )

    monthly_income = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    #Line Profile image URL
    profile_img = models.URLField(
        null=True,
        blank=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"Profile of {self.user}"
