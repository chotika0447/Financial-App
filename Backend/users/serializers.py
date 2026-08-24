from rest_framework import serializers
from .models import User

# เอาไว้ส่งข้อมูล User ออกไป
class UserSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'created_at',
        ]
# เอาไว้รับข้อมูลตอนสมัครสมาชิก 
class RegisterSerializer(serializers.ModelSerializer):

    email = serializers.EmailField()

    class Meta:
        model = User
        fields = [
            'username',
            'email',
            'password',
        ]
        extra_kwargs = {
            'password': {
                'write_only': True
            }
        }
    #override method create เพื่อสร้าง User ใหม่โดยใช้ create_user ของ UserManager
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
        )

        return user