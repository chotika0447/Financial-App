from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),

    # User / Login / Register
    path('api/users/', include('users.urls')),

    # Transaction
    path('api/', include('transactions.urls')),
]