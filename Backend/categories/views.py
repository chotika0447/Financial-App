from django.shortcuts import render

# Create your views here.

from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated

from .models import Category
from .serializers import CategorySerializer


class CategoryListView(ListAPIView):
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Category.objects.all().order_by("name")

        transaction_type = self.request.query_params.get(
            "transaction_type"
        )

        if transaction_type in ["income", "expense"]:
            queryset = queryset.filter(
                transaction_type=transaction_type
            )

        return queryset
