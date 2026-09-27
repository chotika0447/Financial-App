from django.urls import path
from .views import LineRegisterView, LineLoginView, MeView

urlpatterns = [
    path('line-register/', LineRegisterView.as_view(), name='line-register'),
    path('line-login/', LineLoginView.as_view(), name='line-login'),
    path('me/', MeView.as_view(), name='me'),
]
