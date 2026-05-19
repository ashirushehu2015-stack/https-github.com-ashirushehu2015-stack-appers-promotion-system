from rest_framework import serializers
from .models import PromotionDecision
from apps.users.serializers import UserProfileSerializer


class PromotionDecisionSerializer(serializers.ModelSerializer):
    staff_detail = UserProfileSerializer(source="staff", read_only=True)
    decided_by_name = serializers.CharField(source="decided_by.full_name", read_only=True)
    external_approver_name = serializers.CharField(source="external_approver.full_name", read_only=True)

    class Meta:
        model = PromotionDecision
        fields = "__all__"
        read_only_fields = [
            "staff", "cycle", "self_score", "superior_score",
            "average_score", "grade_level_at_eval", "years_in_post",
            "is_eligible_by_maturity", "is_csc_route", "requires_external_approval",
            "decided_by", "decided_at", "external_approver", "external_action_at"
        ]
