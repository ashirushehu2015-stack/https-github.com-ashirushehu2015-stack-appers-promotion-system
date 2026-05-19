"""
RBAC permission classes.
Satisfies checklist item 1.1.
"""
from rest_framework.permissions import BasePermission


class IsStaff(BasePermission):
    """Regular staff member."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "staff")


class IsSuperior(BasePermission):
    """Superior officer — can evaluate staff."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in ("superior", "admin"))


class IsAdmin(BasePermission):
    """System administrator."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "admin")


class IsStaffOrSuperior(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and
                    request.user.role in ("staff", "superior", "admin"))


class IsOwnerOrAdmin(BasePermission):
    """Object-level: user can only access their own objects unless admin."""
    def has_object_permission(self, request, view, obj):
        if request.user.role == "admin":
            return True
        owner_field = getattr(obj, "staff", None) or getattr(obj, "user", None)
        return owner_field == request.user
