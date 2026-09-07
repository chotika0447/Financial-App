from rest_framework.views import APIView #สร้าง API ที่รองรับ HTTP Method GET POST PUT DELETE
from rest_framework.response import Response #ใช้ส่งข้อมูลกลับไปให้คนที่เรียก API
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication

from django.contrib.auth import authenticate

from .models import User
from .serializers import UserSerializer, RegisterSerializer

from django.shortcuts import redirect
from urllib.parse import urlencode


class UserListView(APIView):
    #ถ้ามี HTTP GET Request เข้ามา ให้ทำสิ่งที่อยู่ข้างใน
    def get(self, request):
        users = User.objects.all() #ดึงข้อมูล User ทั้งหมดจากฐานข้อมูล

        serializer = UserSerializer(users, many=True)#แปลงข้อมูล User เป็น JSON ซึ่งเป็นรูปแบบที่ API ส่งกลับได้

        return Response(serializer.data)

class RegisterView(APIView):

    def post(self, request):

        serializer = RegisterSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.save()

            return Response(
                UserSerializer(user).data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
#กรณี login ด้วย email และ password ปกติ
class LoginView(APIView):

    def post(self, request):

        email = request.data.get('email')
        password = request.data.get('password')

        user = authenticate(
            request,
            email=email,
            password=password
        )

        if user is None:
            return Response(
                {'error': 'Invalid email or password'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        refresh = RefreshToken.for_user(user)

        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })
#กรณี login ด้วยบัญชี Google จะได้ token มาแล้วส่งไปที่ API นี้เพื่อแลกเป็น JWT
class GoogleJWTView(APIView):

    authentication_classes = [SessionAuthentication]

    def get(self, request):

        if not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication failed'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        user = request.user

        # ถ้าเป็น User ที่สมัครผ่าน Google และยังไม่มี username ให้ใช้ User ID เป็น username ชั่วคราว
        if not user.username:
            user.username = str(user.id)
            user.save(update_fields=['username'])

        refresh = RefreshToken.for_user(user)

        params = urlencode({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })

        return redirect(
            f'http://localhost:5173/google-callback/?{params}'
        )
    
class MeView(APIView):
    #API นี้อนุญาตเฉพาะ User ที่ผ่าน Authentication แล้ว
    permission_classes = [IsAuthenticated]

    def get(self, request):

        return Response({
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email,
        })