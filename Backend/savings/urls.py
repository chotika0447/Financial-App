from django.urls import path
from .views import SavingsListCreateView, SavingsDetailView

urlpatterns = [
    path('', SavingsListCreateView.as_view(), name='savings-list-create'),
    path('<int:pk>/', SavingsDetailView.as_view(), name='savings-detail'),
]