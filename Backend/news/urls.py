from django.urls import path
from .views import latest_news

urlpatterns = [
    path('', latest_news, name='latest-news'),
]
