from django.db import models
from .audit import AuditLog


class TimeStampedModel(models.Model):
    """Abstract base with created_at / updated_at."""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
