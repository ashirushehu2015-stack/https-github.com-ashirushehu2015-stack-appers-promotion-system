from rest_framework import serializers
from apps.evaluation.models import PromotionCycle
from .models import PromotionRule


class AdminPromotionCycleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromotionCycle
        fields = "__all__"


class PromotionRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromotionRule
        fields = "__all__"
