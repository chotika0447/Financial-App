from django.urls import path
from .views import (
    LineRegisterView,
    LineLoginView,
    LineLogoutView,
    LineTokenRefreshView,
    MeView,
    UserSearchView,
)

urlpatterns = [
    path('line-register/', LineRegisterView.as_view(), name='line-register'),
    path('line-login/', LineLoginView.as_view(), name='line-login'),
    path("line-logout/", LineLogoutView.as_view(), name="line-logout"),
    path('me/', MeView.as_view(), name='me'),
    path('search/', UserSearchView.as_view(), name='user-search'),

    # Refresh JWT Token
    path('token/refresh/', LineTokenRefreshView.as_view(), name='token-refresh'),
]
