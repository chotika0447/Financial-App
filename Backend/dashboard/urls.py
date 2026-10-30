from django.urls import path
from .views import DashboardAPIView
urlpatterns = [
    path('summary/', DashboardAPIView.as_view(), name='dashboard'),
    
]
