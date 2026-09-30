from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('users/', include('users.urls')),
    path('transactions/', include('transactions.urls')),
    path("line/", include("line_bot.urls")),
    path('friends/', include('friends.urls')),
    path('debts/', include('debts.urls')),
]
