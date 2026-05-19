"""
Serializers for Module 1: User Management.
"""
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils import timezone
from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "email", "full_name", "phone",
            "grade_level", "department", "mda",
            "is_csc_mda", "institution",
            "password", "password2",
        ]

    def validate(self, data):
        if data["password"] != data["password2"]:
            raise serializers.ValidationError("Passwords do not match.")
        # Complexity check
        pw = data["password"]
        if not any(c.isupper() for c in pw):
            raise serializers.ValidationError("Password must contain an uppercase letter.")
        if not any(c.isdigit() for c in pw):
            raise serializers.ValidationError("Password must contain a digit.")
        if not any(c in "!@#$%^&*()_+-=[]{}|;':\",./<>?" for c in pw):
            raise serializers.ValidationError("Password must contain a special character.")
        return data

    def create(self, validated_data):
        validated_data.pop("password2")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.password_changed_at = timezone.now()
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(email=data["email"], password=data["password"])
        if not user:
            raise serializers.ValidationError("Invalid credentials.")
        if not user.is_active:
            raise serializers.ValidationError("Account is disabled.")
        data["user"] = user
        return data


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "email", "full_name", "phone",
            "grade_level", "department", "mda",
            "is_csc_mda", "institution", "role",
            "last_promotion_date", "supervisor",
            "totp_verified", "created_at",
        ]
        read_only_fields = ["id", "email", "role", "created_at", "totp_verified"]


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password2 = serializers.CharField(write_only=True)

    def validate(self, data):
        if data["new_password"] != data["new_password2"]:
            raise serializers.ValidationError("New passwords do not match.")
        pw = data["new_password"]
        if not any(c.isupper() for c in pw):
            raise serializers.ValidationError("Password must contain an uppercase letter.")
        if not any(c.isdigit() for c in pw):
            raise serializers.ValidationError("Password must contain a digit.")
        return data


class UserAdminSerializer(serializers.ModelSerializer):
    """Used by Admin to list/edit all users."""
    class Meta:
        model = User
        fields = [
            "id", "email", "full_name", "phone",
            "grade_level", "department", "mda",
            "is_csc_mda", "institution", "role",
            "supervisor", "last_promotion_date",
            "is_active", "failed_login_count",
            "locked_until", "created_at",
        ]
        read_only_fields = ["id", "email", "failed_login_count", "created_at"]
