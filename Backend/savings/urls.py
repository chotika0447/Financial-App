from django.urls import path
from .views import (
    SavingsListCreateView,
    SavingsDetailView,
    SavingsDepositView,
    SavingsWithdrawView,

    SavingsTransactionListView,
    FinHealthWalletView,
)

urlpatterns = [
    path('', SavingsListCreateView.as_view(), name='savings-list-create'),

    path('saving-transac', SavingsTransactionListView.as_view(), name='savings-transactions'),
    path('financial-health/wallet/', FinHealthWalletView.as_view(), name='financial-health-wallet'),

    path('<int:pk>/', SavingsDetailView.as_view(), name='savings-detail'),
    
    path('<int:pk>/deposit/', SavingsDepositView.as_view(), name='savings-deposit'),
    path('<int:pk>/withdraw/', SavingsWithdrawView.as_view(), name='savings-withdraw'),
]
