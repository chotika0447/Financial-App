from django.urls import path
from .views import UserListView, RegisterView, LoginView, GoogleJWTView, MeView

urlpatterns = [
    path('', UserListView.as_view(), name='user-list'),
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('google-token/', GoogleJWTView.as_view(), name='google-token'),
    path('me/', MeView.as_view(), name='me'),
]
#UserListView.as_view() = แปลงคลาส UserListView นี้  เป็น View ที่ใช้กับ URL ได้ 