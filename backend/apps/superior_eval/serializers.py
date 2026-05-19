from rest_framework import serializers
from .models import SuperiorEvaluation
from apps.users.models import User
from apps.evaluation.models import SelfEvaluation, ASPECTS


class SuperiorEvaluationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SuperiorEvaluation
        exclude = ["evaluator", "subject_staff"]
        read_only_fields = ["total_score", "submitted_at", "is_submitted", "cycle"]

    def validate_ratings(self, value):
        for aspect in ASPECTS:
            v = value.get(aspect)
            if v and v not in ("A", "B", "C", "D", "E"):
                raise serializers.ValidationError(f"'{aspect}' must be one of A, B, C, D, E.")
        return value


class SubordinateSerializer(serializers.ModelSerializer):
    has_self_eval = serializers.SerializerMethodField()
    has_superior_eval = serializers.SerializerMethodField()
    self_eval_id = serializers.SerializerMethodField()
    superior_eval_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "full_name", "phone", "grade_level", "department",
                  "mda", "has_self_eval", "has_superior_eval", "self_eval_id", "superior_eval_id"]

    def get_has_self_eval(self, obj):
        cycle = self.context.get("cycle")
        if not cycle:
            return False
        return SelfEvaluation.objects.filter(staff=obj, cycle=cycle.year, is_submitted=True).exists()

    def get_self_eval_id(self, obj):
        cycle = self.context.get("cycle")
        if not cycle:
            return None
        eval_obj = SelfEvaluation.objects.filter(staff=obj, cycle=cycle.year, is_submitted=True).first()
        return eval_obj.id if eval_obj else None

    def get_has_superior_eval(self, obj):
        cycle = self.context.get("cycle")
        if not cycle:
            return False
        return SuperiorEvaluation.objects.filter(subject_staff=obj, cycle=cycle.year, is_submitted=True).exists()

    def get_superior_eval_id(self, obj):
        cycle = self.context.get("cycle")
        if not cycle:
            return None
        eval_obj = SuperiorEvaluation.objects.filter(subject_staff=obj, cycle=cycle.year, is_submitted=True).first()
        return eval_obj.id if eval_obj else None
