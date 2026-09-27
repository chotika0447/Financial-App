from rest_framework.views import APIView #สร้าง API ที่รองรับ HTTP Method GET POST PUT DELETE
from rest_framework.response import Response #ใช้ส่งข้อมูลกลับไปให้คนที่เรียก API
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from django.db import transaction
import requests

from .models import User, PersonalProfile
from .serializers import PersonalProfileSerializer


def create_line_tokens(user):
    refresh = RefreshToken.for_user(user)
    refresh['account_type'] = 'line'
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }


def verify_line_id_token(id_token):
    if not settings.LINE_LOGIN_CHANNEL_ID:
        return None, Response(
            {'error': 'LINE Login is not configured'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    if not id_token:
        return None, Response(
            {'id_token': ['This field is required.']},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        verification = requests.post(
            'https://api.line.me/oauth2/v2.1/verify',
            data={'id_token': id_token, 'client_id': settings.LINE_LOGIN_CHANNEL_ID},
            timeout=10,
        )
    except requests.RequestException:
        return None, Response(
            {'error': 'Could not verify LINE identity'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    if verification.status_code != 200:

        line_error = verification.json()

        if line_error.get('error_description') == 'IdToken expired.':
            return None, Response(
                {
                    'error': 'LINE_ID_TOKEN_EXPIRED',
                    'message': 'LINE ID Token หมดอายุ',
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        return None, Response(
            {
                'error': 'INVALID_LINE_ID_TOKEN',
                'message': 'LINE ID Token ไม่ถูกต้อง',
            },
            status=status.HTTP_401_UNAUTHORIZED
        )

    claims = verification.json()
    if not claims.get('sub'):
        return None, Response(
            {'error': 'LINE identity token has no user ID'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    return claims, None


class LineRegisterView(APIView):

    def post(self, request):
        claims, error_response = verify_line_id_token(request.data.get('id_token'))
        if error_response:
            return error_response

        line_uid = claims['sub']

        if User.objects.filter(line_uid=line_uid).exists():
            return Response(
                {'error': 'This LINE account is already registered'},
                status=status.HTTP_409_CONFLICT
            )

        profile_serializer = PersonalProfileSerializer(data=request.data)
        if not profile_serializer.is_valid():
            return Response(
                profile_serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            user = User.objects.create(
                username=(claims.get('name') or 'LINE User')[:50],
                line_uid=line_uid,
            )
            profile_serializer.save(
                user=user,
                profile_img=claims.get('picture'),
            )
            tokens = create_line_tokens(user)

        return Response(tokens, status=status.HTTP_201_CREATED)


class LineLoginView(APIView):

    def post(self, request):
        claims, error_response = verify_line_id_token(request.data.get('id_token'))
        if error_response:
            return error_response

        user = User.objects.filter(line_uid=claims['sub']).first()
        if user is None:
            return Response(
                {'error': 'LINE account is not registered'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(create_line_tokens(user))

class MeView(APIView):
    #API นี้อนุญาตเฉพาะ User ที่ผ่าน Authentication แล้ว
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = PersonalProfile.objects.filter(user=request.user).first()
        profile_data = (
            PersonalProfileSerializer(profile).data
            if profile
            else {
                'email': None,
                'age': None,
                'occupation': None,
                'monthly_income': '0.00',
            }
        )

        return Response({
            'uid': request.user.uid,
            'username': request.user.username,
            'profile_img': profile.profile_img if profile else None,
            **profile_data,
        })
    #ฟังก์ชันแก้ไขข้อมูลโปรไฟล์
    def patch(self, request):
        profile, _ = PersonalProfile.objects.get_or_create(user=request.user)
        serializer = PersonalProfileSerializer(
            profile,
            data=request.data,
            partial=True,
        )

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        profile = serializer.save()
        return Response({
            'uid': request.user.uid,
            'username': request.user.username,
            'profile_img': profile.profile_img,
            **serializer.data,
        })