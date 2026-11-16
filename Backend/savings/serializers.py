from rest_framework import serializers
from .models import Savings 

class SavingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Savings
        fields = [
            "saving_id",
            "user",
            "saving_name",
            "balance",
            "created_at",
            "updated_at",
            "target",
            "target_date",
            "status",
            "start_date",
            "end_date"
        ]

        read_only_fields = [
            "saving_id",
            "user",
            "created_at",
            "updated_at",
            "balance",
        ]

    #ตรวจสอบเงินเป้าหมายต้องไม่เป็นค่าลบ
    def validate_target(self, value):
        if value < 0:
            raise serializers.ValidationError("จำนวนเป้าหมายเงินออมต้องไม่น้อยกว่า 0")
        return value
    #ตรวจสอบวันที่เป้าหมายต้องไม่เป็นวันในอดีต
    def validate_target_date(self, value):
        if value is not None:
            from datetime import date
            if value < date.today():
                raise serializers.ValidationError("วันที่เป้าหมายต้องไม่เป็นวันในอดีต")
        return value
