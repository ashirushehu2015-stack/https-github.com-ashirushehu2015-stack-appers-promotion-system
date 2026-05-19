"""
Module 7: Admin Module.
Allows dynamic promotion rules setup.
Satisfies checklist rules configuration parameters.
"""
from django.db import models
from core.models import TimeStampedModel


class PromotionRule(TimeStampedModel):
    """Dynamic setting for Grade Level maturity requirements."""
    grade_level_start = models.PositiveSmallIntegerField()
    grade_level_end = models.PositiveSmallIntegerField()
    required_years = models.PositiveSmallIntegerField()
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["grade_level_start"]

    def __str__(self):
        return f"GL {self.grade_level_start:02d}-{self.grade_level_end:02d} require {self.required_years}y"
