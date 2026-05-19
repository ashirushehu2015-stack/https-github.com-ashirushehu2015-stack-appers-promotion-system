"""
Module 3: Evaluation Form (D5 — Self Evaluation)
Satisfies checklist items 4.1–4.9.
"""
from django.db import models
from django.conf import settings
from core.models import TimeStampedModel


SCORE_MAP = {"A": 5, "B": 4, "C": 3, "D": 2, "E": 1}

ASPECTS = [
    "foresight", "penetration", "judgment", "paper", "oral",
    "numerical", "colleagues", "public", "responsibility",
    "pressure", "drive", "professional", "management", "output",
    "quality", "punctuality",
]


class PromotionCycle(TimeStampedModel):
    """Admin-configured cycle with deadline."""
    year = models.CharField(max_length=10, unique=True)
    start_date = models.DateField()
    deadline = models.DateField()
    is_active = models.BooleanField(default=True)
    fee_amount = models.DecimalField(max_digits=10, decimal_places=2, default=5000)

    def __str__(self):
        return f"Cycle {self.year} (deadline: {self.deadline})"


class SelfEvaluation(TimeStampedModel):
    """D5 — Staff self-evaluation form submission."""
    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="self_evaluations",
    )
    cycle = models.CharField(max_length=10)

    # Part One — Personal Records
    period_from = models.CharField(max_length=20, blank=True)
    period_to = models.CharField(max_length=20, blank=True)
    qualifications = models.CharField(max_length=500, blank=True)
    first_appointment_date = models.CharField(max_length=20, blank=True)
    grade_date = models.CharField(max_length=20, blank=True)
    acting_appointment = models.CharField(max_length=255, blank=True)
    courses = models.CharField(max_length=500, blank=True)
    sick_days = models.CharField(max_length=10, blank=True)
    main_duties = models.TextField(blank=True)
    adhoc_duties = models.TextField(blank=True)

    # Part Two — Assessment answers (A-E per aspect)
    answers = models.JSONField(default=dict)   # {"foresight": "A", ...}
    overall_rating = models.CharField(max_length=20, blank=True)  # Outstanding/VeryGood/...
    staff_comment = models.TextField(blank=True)
    effectiveness = models.TextField(blank=True)
    job_agreement = models.CharField(max_length=500, blank=True)

    # Part Three — Promotability
    training_needs = models.TextField(blank=True)
    training_met = models.TextField(blank=True)
    next_job_diff = models.CharField(max_length=5, blank=True)
    next_job_transfer = models.CharField(max_length=5, blank=True)
    next_job_reason = models.CharField(max_length=500, blank=True)
    normal_promotion = models.CharField(max_length=20, blank=True)
    normal_promo_grade = models.CharField(max_length=10, blank=True)
    promo_comment = models.TextField(blank=True)
    special_promo_grade = models.CharField(max_length=10, blank=True)
    special_promo_reason = models.TextField(blank=True)
    long_term_potential = models.CharField(max_length=5, blank=True)
    general_remarks = models.TextField(blank=True)

    # Calculated score
    total_score = models.FloatField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    is_submitted = models.BooleanField(default=False)

    class Meta:
        unique_together = [("staff", "cycle")]
        ordering = ["-created_at"]

    def calculate_score(self):
        """Convert A-E answers to numeric score (average)."""
        scores = [SCORE_MAP.get(v, 0) for v in self.answers.values() if v in SCORE_MAP]
        self.total_score = round(sum(scores) / len(scores), 2) if scores else 0.0
        return self.total_score

    def __str__(self):
        return f"SelfEval: {self.staff} / {self.cycle}"
