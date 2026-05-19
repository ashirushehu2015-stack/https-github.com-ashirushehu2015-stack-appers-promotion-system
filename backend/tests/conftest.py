import pytest
from rest_framework.test import APIClient
from apps.users.models import User


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def create_staff_user(db):
    def make_user(email="staff@mda.gov.ng", password="Password123!"):
        return User.objects.create_user(
            email=email,
            password=password,
            full_name="Test Staff Member",
            grade_level="07",
            mda="MDA-1",
            department="Finance",
            role="staff",
        )
    return make_user


@pytest.fixture
def create_superior_user(db):
    def make_user(email="superior@mda.gov.ng", password="Password123!"):
        return User.objects.create_user(
            email=email,
            password=password,
            full_name="Test Superior Officer",
            grade_level="12",
            mda="MDA-1",
            department="Finance",
            role="superior",
        )
    return make_user


@pytest.fixture
def create_admin_user(db):
    def make_user(email="admin@appers.gov.ng", password="Password123!"):
        return User.objects.create_superuser(
            email=email,
            password=password,
            full_name="System Admin",
            grade_level="15",
            mda="APPERS-HQ",
            department="IT",
        )
    return make_user
