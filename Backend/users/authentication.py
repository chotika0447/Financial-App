
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed

from .models import User, LoginHistory


class LineJWTAuthentication(JWTAuthentication):

    def get_user(self, validated_token):

        # ตรวจสอบ UID ใน JWT
        try:
            user_id = validated_token["uid"]
        except KeyError:
            raise AuthenticationFailed(
                "Token contained no recognizable user identification",
                code="token_no_user_id",
            )

        # ค้นหาผู้ใช้
        try:
            user = User.objects.get(uid=user_id)
        except User.DoesNotExist:
            raise AuthenticationFailed(
                "User not found",
                code="user_not_found",
            )

        # ตรวจสอบสถานะบัญชี
        if not user.is_active:
            raise AuthenticationFailed(
                "User is inactive",
                code="user_inactive",
            )

        # ตรวจสอบ Login Session
        history_id = validated_token.get("login_history_id")

        if not history_id:
            raise AuthenticationFailed(
                "Token has no login session",
                code="login_session_missing",
            )

        # ตรวจสอบว่าประวัติ Login ยังใช้งานอยู่
        is_valid_session = LoginHistory.objects.filter(
            history_id=history_id,
            uid=user,
            status=LoginHistory.LoginStatus.SUCCESS,
            logout_at__isnull=True,
        ).exists()

        if not is_valid_session:
            raise AuthenticationFailed(
                "Login session has expired or logged out",
                code="login_session_invalid",
            )

        return user
