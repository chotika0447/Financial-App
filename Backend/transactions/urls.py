from django.urls import path

from .views import (
    TransactionDraftConfirmView,
    TransactionListCreateView,
    TransactionDetailView,
    ReceiptOCRView,
    TransactionDraftDetailView,
)

urlpatterns = [
    path('', TransactionListCreateView.as_view(), name='transaction-list-create'),
    path('ocr/', ReceiptOCRView.as_view(), name='transaction-ocr'),
    path('<int:pk>/', TransactionDetailView.as_view(), name='transaction-detail'),
    path('drafts/<int:pk>/', TransactionDraftDetailView.as_view(), name='transaction-draft-detail'),
    path('drafts/<int:pk>/confirm/', TransactionDraftConfirmView.as_view(), name='transaction-draft-confirm'),
]
