from django.urls import path

from .views import (
    TransactionListCreateView,
    TransactionDetailView,
    ReceiptOCRView,
)

urlpatterns = [
    path('', TransactionListCreateView.as_view(), name='transaction-list-create'),
    path('ocr/', ReceiptOCRView.as_view(), name='transaction-ocr'),
    path('<int:pk>/', TransactionDetailView.as_view(), name='transaction-detail'),
]
