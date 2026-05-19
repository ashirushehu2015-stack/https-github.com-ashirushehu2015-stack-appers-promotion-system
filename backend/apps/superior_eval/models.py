"""
Module 4: Superior Evaluation (D6).
Satisfies checklist items 4.4–4.9.
"""
from django.db import models
from django.conf import settings
from core.models import TimeStampedModel


class SuperiorEvaluation(TimeStampedModel):
    """D6 — Superior officer's evaluation of a staff member."""
    evaluator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="given_evaluations",
    )
    subject_staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_evaluations",
    )
    cycle = models.CharField(max_length=10)

    # Ratings stored as JSON: {"foresight": "A", ...}
    ratings = models.JSONField(default=dict)
    overall_rating = models.CharField(max_length=20, blank=True)
    comments = models.TextField(blank=True)    # 4.8
    promotability = models.CharField(max_length=20, blank=True)
    promo_grade = models.CharField(max_length=10, blank=True)
    long_term_potential = models.CharField(max_length=5, blank=True)
    served_years = models.CharField(max_length=10, blank=True)

    total_score = models.FloatField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    is_submitted = models.BooleanField(default=False)

    class Meta:
        unique_together = [("evaluator", "subject_staff", "cycle")]  # 4.9
        ordering = ["-created_at"]

    def calculate_score(self):
        from apps.evaluation.models import SCORE_MAP
        scores = [SCORE_MAP.get(v, 0) for v in self.ratings.values() if v in SCORE_MAP]
        self.total_score = round(sum(scores) / len(scores), 2) if scores else 0.0
        return self.total_score

    def __str__(self):
        return f"SuperiorEval: {self.evaluator} → {self.subject_staff} / {self.cycle}"
