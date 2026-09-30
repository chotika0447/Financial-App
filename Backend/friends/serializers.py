
from rest_framework import serializers
from .models import Friends
from users.models import User

class FriendRequestSerializer(serializers.ModelSerializer):
    receiver = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all()
    )

    class Meta:
        model = Friends
        fields = [
            'id',
            'sender',
            'receiver',
            'status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'sender',
            'status',
            'created_at',
            'updated_at',
        ]


class FriendSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(
        source='sender.username',
        read_only=True
    )

    receiver_name = serializers.CharField(
        source='receiver.username',
        read_only=True
    )

    class Meta:
        model = Friends
        fields = [
            'id',
            'sender',
            'sender_name',
            'receiver',
            'receiver_name',
            'status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

