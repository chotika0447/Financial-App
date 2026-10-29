from django.db.models import Q
from rest_framework import status
from rest_framework.generics import ListCreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Category
from .serializers import CategorySerializer


class CategoryListView(ListCreateAPIView):
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Category.objects.filter(
            Q(user__isnull=True) | Q(user=self.request.user)
        ).order_by("name")
        transaction_type = self.request.query_params.get("transaction_type")
        if transaction_type in ["income", "expense"]:
            queryset = queryset.filter(transaction_type=transaction_type)
        return queryset

    def create(self, request, *args, **kwargs):
        name = str(request.data.get("name", "")).strip()
        transaction_type = request.data.get("transaction_type")
        if not name or len(name) > 100:
            return Response({"error": "กรุณาระบุชื่อหมวดหมู่ไม่เกิน 100 ตัวอักษร"}, status=400)
        if transaction_type not in ["income", "expense"]:
            return Response({"error": "กรุณาเลือกประเภทรายรับหรือรายจ่าย"}, status=400)
        if Category.objects.filter(
            Q(user__isnull=True) | Q(user=request.user),
            name__iexact=name, transaction_type=transaction_type
        ).exists():
            return Response({"error": "มีหมวดหมู่นี้อยู่แล้ว"}, status=400)
        category = Category.objects.create(
            user=request.user, name=name, transaction_type=transaction_type
        )
        return Response({"id": category.id, "name": category.name,
                         "transaction_type": category.transaction_type},
                        status=status.HTTP_201_CREATED)
