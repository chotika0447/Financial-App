from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.models import User
from .models import Friends
from .serializers import FriendRequestSerializer, FriendSerializer


class SendFriendRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        receiver_uid = request.data.get('receiver')

        if not receiver_uid:
            return Response(
                {'detail': 'กรุณาระบุ UID ของผู้ที่ต้องการเพิ่มเป็นเพื่อน'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # หาผู้รับคำขอ
        try:
            receiver = User.objects.get(uid=receiver_uid)
        except User.DoesNotExist:
            return Response(
                {'detail': 'ไม่พบผู้ใช้งานนี้'},
                status=status.HTTP_404_NOT_FOUND
            )

        # ป้องกันส่งคำขอหาตัวเอง
        if request.user.uid == receiver.uid:
            return Response(
                {'detail': 'ไม่สามารถส่งคำขอเป็นเพื่อนให้ตัวเองได้'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ตรวจสอบทั้ง A → B และ B → A
        existing_friend = Friends.objects.filter(
            Q(sender=request.user, receiver=receiver) |
            Q(sender=receiver, receiver=request.user)
        ).first()

        if existing_friend:
            if existing_friend.status == 'pending':
                return Response(
                    {'detail': 'มีคำขอเป็นเพื่อนระหว่างผู้ใช้งานสองคนนี้อยู่แล้ว'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if existing_friend.status == 'accepted':
                return Response(
                    {'detail': 'ผู้ใช้งานนี้เป็นเพื่อนกับคุณอยู่แล้ว'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if existing_friend.status == 'rejected':
                # ถ้าเคยปฏิเสธ อนุญาตให้ส่งคำขอใหม่
                existing_friend.sender = request.user
                existing_friend.receiver = receiver
                existing_friend.status = 'pending'
                existing_friend.save()

                serializer = FriendSerializer(existing_friend)

                return Response(
                    serializer.data,
                    status=status.HTTP_200_OK
                )

        # ยังไม่มีความสัมพันธ์ → สร้างคำขอใหม่
        friend_request = Friends.objects.create(
            sender=request.user,
            receiver=receiver,
            status='pending'
        )

        serializer = FriendSerializer(friend_request)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


class FriendRequestListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # คำขอที่คนอื่นส่งมาให้เรา
        requests = Friends.objects.filter(
            receiver=request.user,
            status='pending'
        ).order_by('-created_at')

        serializer = FriendSerializer(requests, many=True)

        return Response(serializer.data)


class AcceptFriendRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, friend_id):
        try:
            friend_request = Friends.objects.get(
                id=friend_id,
                receiver=request.user,
                status='pending'
            )
        except Friends.DoesNotExist:
            return Response(
                {'detail': 'ไม่พบคำขอเป็นเพื่อนนี้'},
                status=status.HTTP_404_NOT_FOUND
            )

        friend_request.status = 'accepted'
        friend_request.save()

        serializer = FriendSerializer(friend_request)

        return Response(serializer.data)


class RejectFriendRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, friend_id):
        try:
            friend_request = Friends.objects.get(
                id=friend_id,
                receiver=request.user,
                status='pending'
            )
        except Friends.DoesNotExist:
            return Response(
                {'detail': 'ไม่พบคำขอเป็นเพื่อนนี้'},
                status=status.HTTP_404_NOT_FOUND
            )

        friend_request.status = 'rejected'
        friend_request.save()

        serializer = FriendSerializer(friend_request)

        return Response(serializer.data)


class FriendListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        friends = Friends.objects.filter(
            Q(sender=request.user) | Q(receiver=request.user),
            status='accepted'
        ).order_by('-updated_at')

        serializer = FriendSerializer(friends, many=True)

        return Response(serializer.data)


class RemoveFriendView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, friend_id):
        try:
            friend = Friends.objects.get(
                id=friend_id,
                status='accepted'
            )
        except Friends.DoesNotExist:
            return Response(
                {'detail': 'ไม่พบเพื่อนนี้'},
                status=status.HTTP_404_NOT_FOUND
            )

        # ตรวจสอบว่า request.user เป็นหนึ่งในคู่เพื่อนจริง
        if friend.sender != request.user and friend.receiver != request.user:
            return Response(
                {'detail': 'คุณไม่มีสิทธิ์ลบความสัมพันธ์นี้'},
                status=status.HTTP_403_FORBIDDEN
            )

        friend.delete()

        return Response(
            {'detail': 'ลบเพื่อนเรียบร้อยแล้ว'},
            status=status.HTTP_200_OK
        )

