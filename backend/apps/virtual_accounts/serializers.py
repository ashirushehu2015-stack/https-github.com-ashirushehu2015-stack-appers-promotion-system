from rest_framework import serializers
from .models import VirtualAccount, PaymentStatus, BankTransaction


class VirtualAccountSerializer(serializers.ModelSerializer):
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = VirtualAccount
        fields = ["id", "account_number", "amount_due", "status", "expires_at",
                  "confirmed_at", "cycle", "is_expired", "created_at"]

    def get_is_expired(self, obj):
        return obj.is_expired()


class PaymentStatusSerializer(serializers.ModelSerializer):
    virtual_account = VirtualAccountSerializer(read_only=True)
    staff_email = serializers.CharField(source="staff.email", read_only=True)
    staff_name = serializers.CharField(source="staff.full_name", read_only=True)

    class Meta:
        model = PaymentStatus
        fields = ["id", "staff_email", "staff_name", "cycle", "paid",
                  "confirmed_at", "virtual_account", "created_at"]


class BankTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankTransaction
        fields = ["id", "tx_ref", "amount", "account_number",
                  "status", "rejection_reason", "received_at"]
