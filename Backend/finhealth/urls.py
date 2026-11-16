
from django.urls import path
from .views import FinancialCycleView

urlpatterns = [
    path(
        "cycle/",
        FinancialCycleView.as_view(),
        name="financial-cycle"
    ),
]
