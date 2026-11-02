from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView

urlpatterns = [
    path('', RedirectView.as_view(url='/admin/', permanent=False), name='home'),
    path('admin/', admin.site.urls),
    path('users/', include('users.urls')),

    path('transactions/', include('transactions.urls')),
    path('savings/', include('savings.urls')),
    path('debts/', include('debts.urls')),

    path('line/', include('line_bot.urls')),
    path('friends/', include('friends.urls')),
    path("categories/", include("categories.urls")),
    path('news/', include('news.urls')),
    path('dashboard/', include('dashboard.urls')),
]
