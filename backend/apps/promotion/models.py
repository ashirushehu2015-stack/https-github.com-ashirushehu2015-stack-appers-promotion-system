"""
Module 5: Promotion Engine Models.
Stores final promotion eligibility, marks, external flags, and decisions.
Satisfies core business rule GL-based maturity requirements.
"""
from django.db import models
from django.conf import settings
from core.models import TimeStampedModel


class PromotionDecision(TimeStampedModel):
    RECOMMENDATION_CHOICES = [
        ("pending", "Pending Review"),
        ("promote", "Recommend for Promotion"),
        ("retain", "Retain in Post"),
        ("defer", "Defer Promotion"),
    ]

    APPROVAL_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="promotion_decisions",
    )
    cycle = models.CharField(max_length=10)

    # Core scores
    self_score = models.FloatField(default=0.0)
    superior_score = models.FloatField(default=0.0)
    average_score = models.FloatField(default=0.0)

    # Eligibility details
    grade_level_at_eval = models.CharField(max_length=10)
    years_in_post = models.FloatField(default=0.0)
    is_eligible_by_maturity = models.BooleanField(default=False)

    # Workflow routing flags
    is_csc_route = models.BooleanField(default=False)  # True if staff MDA is under CSC
    requires_external_approval = models.BooleanField(default=False)

    # Decision details
    recommendation = models.CharField(
        max_length=20, choices=RECOMMENDATION_CHOICES, default="pending"
    )
    remarks = models.TextField(blank=True)
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="given_decisions"
    )
    decided_at = models.DateTimeField(null=True, blank=True)

    # External Head of Service / CSC Approval (for is_csc_route)
    external_status = models.CharField(
        max_length=20, choices=APPROVAL_STATUS_CHOICES, default="pending"
    )
    external_remarks = models.TextField(blank=True)
    external_approver = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="external_approvals"
    )
    external_action_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [("staff", "cycle")]
        ordering = ["-average_score"]

    def __str__(self):
        return f"PromoDecision: {self.staff} Cycle={self.cycle} Rec={self.recommendation}"
