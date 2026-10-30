from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated

from .models import Category
from .serializers import CategorySerializer


class CategoryListView(ListAPIView):
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # แสดงเฉพาะหมวดหมู่ส่วนกลาง
        queryset = Category.objects.filter(
            user__isnull=True
        ).order_by("name")

        # กรองประเภทรายรับหรือรายจ่าย
        transaction_type = self.request.query_params.get(
            "transaction_type"
        )

        if transaction_type in ["income", "expense"]:
            queryset = queryset.filter(
                transaction_type=transaction_type
            )

        return queryset