from django.urls import path
from .views import (
    SavingsDepositView,
    SavingsDetailView,
    SavingsListCreateView,
    SavingsWithdrawView,
)

urlpatterns = [
    path('', SavingsListCreateView.as_view(), name='savings-list-create'),
    path('<int:pk>/deposit/', SavingsDepositView.as_view(), name='savings-deposit'),
    path('<int:pk>/withdraw/', SavingsWithdrawView.as_view(), name='savings-withdraw'),
    path('<int:pk>/', SavingsDetailView.as_view(), name='savings-detail'),
]
