from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('allauth.urls')),
    path('api/users/', include('users.urls')),
    path('api/transactions/', include('transactions.urls')),
]
