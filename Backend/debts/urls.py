from django.urls import path
from .views import (
    DebtListCreateView,
    DebtDetailView,
    PaymentListCreateView,
    PaymentDetailView,
    SendDebtReminderView,
    FinHealthBorrowView
)
urlpatterns = [
    # หนี้
    path('',DebtListCreateView.as_view(),name='debt-list-create'),
    path('<int:debt_id>/',DebtDetailView.as_view(),name='debt-detail'),

    # การชำระหนี้
    path('<int:debt_id>/payments/',PaymentListCreateView.as_view(),name='payment-list-create'),
    path('payments/<int:payment_id>/',PaymentDetailView.as_view(),name='payment-detail'),

    # การแจ้งเตือนชำระหนี้
    path("<int:debt_id>/send-reminder/", SendDebtReminderView.as_view(), name="debt-send-reminder"),

    path('financial-health/borrow/', FinHealthBorrowView.as_view(), name='financial-health-borrow',),
]

