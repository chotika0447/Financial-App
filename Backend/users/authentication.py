from rest_framework_simplejwt.authentication import JWTAuthentication #สืบทอดความสามารถเดิมจาก JWTAuthentication  จะได้ไม่ต้องเขียนใหม่หมด
from rest_framework_simplejwt.exceptions import AuthenticationFailed #ใช้แจ้งว่า Token / User authentication ไม่ผ่าน  

from .models import User


class LineJWTAuthentication(JWTAuthentication):

    #override method ของ JWTAuthentication
    def get_user(self, validated_token):
        try:
            user_id = validated_token['uid'] 
        except KeyError:
            #Token ไม่มีข้อมูลที่ใช้ระบุ User
            raise AuthenticationFailed(
                "Token contained no recognizable user identification",
                code="token_no_user_id",
            )

        try:
            #หา user ใน DB
            user = User.objects.get(uid=user_id)
        except User.DoesNotExist:
            raise AuthenticationFailed(
                "User not found",
                code="user_not_found",
            )

        if not user.is_active:
            #ถ้าผู้ใช้ถูกระงับบัญชีจะไม่สามารถใช้ JWT เพื่อเรียก API ที่ต้อง Login ได้
            raise AuthenticationFailed(
                "User is inactive",
                code="user_inactive",
            )

        #ส่ง User ที่หาเจอกลับไปให้ DRF
        return user