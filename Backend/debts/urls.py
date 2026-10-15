from django.urls import path
from .views import (DebtListCreateView,DebtDetailView,PaymentListCreateView,PaymentDetailView)

urlpatterns = [
    # หนี้
    path('',DebtListCreateView.as_view(),name='debt-list-create'),
    path('<int:debt_id>/',DebtDetailView.as_view(),name='debt-detail'),

    # การชำระหนี้
    path('<int:debt_id>/payments/',PaymentListCreateView.as_view(),name='payment-list-create'),
    path('payments/<int:payment_id>/',PaymentDetailView.as_view(),name='payment-detail'),
]

