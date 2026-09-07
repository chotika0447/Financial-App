from django.db import models #เอาไว้กำหนดประเภทของข้อมูลที่จะเก็บในฐานข้อมูล
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
import random

"""
ใช้  AbstractBaseUser  ในการสร้าง Custom User แทนแบบ Default ของ Django  
    BaseUserManager สร้าง User Manager
    PermissionsMixin สำหรับระบบ Admin และ Permission ของ Django 
"""
def generate_user_id():
    return random.randint(1000000000, 9999999999)

class UserManager(BaseUserManager):

    #ใช้สำหรับสร้าง User ปกติ
    def create_user(self, email, username, password=None, **extra_fields):

        if not email:
            raise ValueError("Email is required")

        email = self.normalize_email(email)

        while True:
            user_id = generate_user_id()
            #เช็คว่ามี user_id นี้อยู่ในฐานข้อมูลอยู่แล้สมั้ย ถ้าไม่มีให้ break ออกจาก loop
            if not self.model.objects.filter(id=user_id).exists():
                break

        #สร้าง object ของ User โดยใช้ self.model ซึ่งจะชี้ไปที่โมเดล User ที่เราสร้างขึ้น
        user = self.model(
            id=user_id,
            email=email,
            username=username,
            **extra_fields
        )

        user.set_password(password)
        user.save(using=self._db)

        return user
    
    #ใช้สำหรับสร้าง Admin ของ Django
    def create_superuser(self, email, username, password=None, **extra_fields):
        #กำหนดสิทธิ์ Admin  
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        #เรียกใช้ create_user เพื่อสร้าง User ที่เป็น Admin
        return self.create_user(
            email=email,
            username=username,
            password=password,
            **extra_fields
        )

#ตัวโมเดลเป็น Custom User Model ที่สร้างจาก AbstractBaseUser
class User(AbstractBaseUser, PermissionsMixin):

    id = models.BigIntegerField(
        primary_key=True,
        default=generate_user_id,
        editable=False,
    )

    username = models.CharField(
        max_length=50,
    )

    email = models.EmailField(
        unique=True #ห้ามซ้ำ
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    is_active = models.BooleanField(
        default=True
    )

    is_staff = models.BooleanField(
        default=False
    )

    objects = UserManager()#ใช้บอก Django ว่าสำหรับ Model นี้ ให้ใช้ UserManager เป็น Manager  

    USERNAME_FIELD = 'email'#ใช้บอก Django ว่าค่าที่ใช้ระบุตัวตนตอน Login คือ Email ไม่ใช่ username ที่เป็นค่า deafult ของ Django

    REQUIRED_FIELDS = ['username']

    #กำหนดชื่อ Object ของ User ด้วย Email เพื่อให้ Admin สามารถระบุ User ได้ง่าย
    def __str__(self):
        return self.email