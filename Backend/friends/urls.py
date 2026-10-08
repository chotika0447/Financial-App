from django.urls import path

from .views import (SendFriendRequestView,FriendRequestListView,AcceptFriendRequestView,
    RejectFriendRequestView,FriendListView,RemoveFriendView,)


urlpatterns = [
    # ส่งคำขอเป็นเพื่อน
    path(
        'request/',
        SendFriendRequestView.as_view(),
        name='send-friend-request'
    ),

    # ดูคำขอที่ได้รับ
    path(
        'requests/',
        FriendRequestListView.as_view(),
        name='friend-request-list'
    ),

    # ยอมรับคำขอ
    path(
        'requests/<int:friend_id>/accept/',
        AcceptFriendRequestView.as_view(),
        name='accept-friend-request'
    ),

    # ปฏิเสธคำขอ
    path(
        'requests/<int:friend_id>/reject/',
        RejectFriendRequestView.as_view(),
        name='reject-friend-request'
    ),

    # ดูรายชื่อเพื่อน
    path(
        'list/',
        FriendListView.as_view(),
        name='friend-list'
    ),

    # ลบเพื่อน
    path(
        '<int:friend_id>/',
        RemoveFriendView.as_view(),
        name='remove-friend'
    ),
]

