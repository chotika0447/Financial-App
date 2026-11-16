
from decimal import Decimal

from rest_framework import serializers
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken

from .models import PersonalProfile, User, LoginHistory


class LineTokenRefreshSerializer(TokenRefreshSerializer):

    def validate(self, attrs):

        # 1. สร้าง RefreshToken จาก Token ที่ส่งมา
        refresh = RefreshToken(attrs["refresh"])

        # 2. ดึง UID จาก Token
        user_id = refresh.payload.get(
            api_settings.USER_ID_CLAIM
        )

        if user_id is None:
            raise InvalidToken(
                "Token contained no recognizable user identification"
            )

        # 3. ตรวจสอบว่าผู้ใช้มีอยู่จริง
        try:
            user = User.objects.get(
                **{api_settings.USER_ID_FIELD: user_id}
            )
        except User.DoesNotExist as error:
            raise InvalidToken("User not found") from error

        # 4. ตรวจสอบสถานะบัญชี
        if not user.is_active:
            raise InvalidToken("User is inactive")

        # 5. ดึง LoginHistory ID
        history_id = refresh.payload.get("login_history_id")

        if not history_id:
            raise InvalidToken("Login session missing")

        # 6. ตรวจสอบว่ายังไม่ได้ Logout
        is_valid_session = LoginHistory.objects.filter(
            history_id=history_id,
            uid=user,
            status=LoginHistory.LoginStatus.SUCCESS,
            logout_at__isnull=True,
        ).exists()

        if not is_valid_session:
            raise InvalidToken(
                "Login session invalid or already logged out"
            )

        # 7. ออก Access Token ใหม่
        return {
            "access": str(refresh.access_token)
        }


class PersonalProfileSerializer(serializers.ModelSerializer):

    email = serializers.EmailField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    age = serializers.IntegerField(min_value=1)

    occupation = serializers.CharField(
        max_length=100,
        trim_whitespace=True
    )

    salary = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0"),
    )

    class Meta:
        model = PersonalProfile

        fields = [
            "profile_id",
            "email",
            "age",
            "occupation",
            "salary",
            "profile_img",
        ]
