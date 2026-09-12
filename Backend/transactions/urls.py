""" from django.urls import path
from .views import TransactionViewSet

transaction_list = TransactionViewSet.as_view({
    'get': 'list',
    'post': 'create',
})

transaction_detail = TransactionViewSet.as_view({
    'get': 'retrieve',
    'put': 'update',
    'patch': 'partial_update',
    'delete': 'destroy',
})

# 1. ผูก action 'summary' เข้ากับ HTTP GET
transaction_summary = TransactionViewSet.as_view({
    'get': 'summary',
})

urlpatterns = [
    path('transactions/', transaction_list, name='transaction-list'),
    
    # 2. เพิ่มเส้นทางนี้ และต้องวางไว้ "ก่อน" เส้น <int:pk>/ เสมอ
    path('transactions/summary/', transaction_summary, name='transaction-summary'),
    
    path('transactions/<int:pk>/', transaction_detail, name='transaction-detail'),
] """

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TransactionViewSet

router = DefaultRouter()
router.register(r'transactions', TransactionViewSet, basename='transaction')

urlpatterns = [
    path('', include(router.urls)),
]