from decimal import Decimal

from rest_framework import serializers

from .models import PersonalProfile


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