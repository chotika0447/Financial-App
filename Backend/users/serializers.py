from decimal import Decimal

from rest_framework import serializers
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken

from .models import PersonalProfile, User


class LineTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        refresh = RefreshToken(attrs['refresh'])
        user_id = refresh.payload.get(api_settings.USER_ID_CLAIM)

        if user_id is None:
            raise InvalidToken('Token contained no recognizable user identification')

        try:
            user = User.objects.get(
                **{api_settings.USER_ID_FIELD: user_id},
            )
        except User.DoesNotExist as error:
            raise InvalidToken('User not found') from error

        if not user.is_active:
            raise InvalidToken('User is inactive')

        return {'access': str(refresh.access_token)}


class PersonalProfileSerializer(serializers.ModelSerializer):
    
    email = serializers.EmailField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    age = serializers.IntegerField(min_value=1)
    occupation = serializers.CharField(max_length=100, trim_whitespace=True)
    monthly_income = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal('0'),
    )

    class Meta:
        model = PersonalProfile
        fields = [
            'profile_id',
            'email',
            'age',
            'occupation',
            'monthly_income',
            'profile_img',
        ]