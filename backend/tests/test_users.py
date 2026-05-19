import pytest
from django.urls import reverse
from apps.users.models import User


@pytest.mark.django_db
def test_user_registration(api_client):
    url = reverse("register")
    payload = {
        "email": "register@mda.gov.ng",
        "full_name": "New Register",
        "grade_level": "06",
        "mda": "MDA-2",
        "department": "Admin",
        "password": "SecurePassword1!",
        "password2": "SecurePassword1!"
    }
    
    response = api_client.post(url, payload, format="json")
    assert response.status_code == 201
    assert User.objects.filter(email="register@mda.gov.ng").exists()


@pytest.mark.django_db
def test_password_complexity_failure(api_client):
    url = reverse("register")
    payload = {
        "email": "simple@mda.gov.ng",
        "full_name": "New Register",
        "grade_level": "06",
        "mda": "MDA-2",
        "department": "Admin",
        "password": "simple",
        "password2": "simple"
    }
    
    response = api_client.post(url, payload, format="json")
    assert response.status_code == 400


@pytest.mark.django_db
def test_login_lockout_trigger(api_client, create_staff_user):
    user = create_staff_user()
    url = reverse("login")
    
    # Trigger 5 failed login attempts
    for _ in range(5):
        api_client.post(url, {"email": user.email, "password": "WrongPassword!"})
        
    user.refresh_from_db()
    assert user.is_locked()
    
    # Try logging in with correct password while locked
    response = api_client.post(url, {"email": user.email, "password": "Password123!"})
    assert response.status_code == 403
