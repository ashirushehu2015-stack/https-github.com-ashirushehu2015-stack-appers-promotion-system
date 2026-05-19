from rest_framework import serializers
from .models import SelfEvaluation, PromotionCycle, ASPECTS


class SelfEvaluationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SelfEvaluation
        exclude = ["staff"]
        read_only_fields = ["total_score", "submitted_at", "is_submitted", "cycle"]

    def validate_answers(self, value):
        for aspect in ASPECTS:
            v = value.get(aspect)
            if v and v not in ("A", "B", "C", "D", "E"):
                raise serializers.ValidationError(f"'{aspect}' must be one of A, B, C, D, E.")
        return value


class PromotionCycleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromotionCycle
        fields = "__all__"
