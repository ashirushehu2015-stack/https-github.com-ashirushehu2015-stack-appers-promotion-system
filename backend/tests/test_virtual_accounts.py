import pytest
import hmac
import hashlib
import json
from django.urls import reverse
from apps.virtual_accounts.models import VirtualAccount, BankTransaction, PaymentStatus


@pytest.mark.django_db
def test_va_generation(api_client, create_staff_user):
    user = create_staff_user()
    api_client.force_authenticate(user=user)
    
    url = reverse("va_request")
    response = api_client.post(url)
    assert response.status_code == 201
    assert "account_number" in response.data
    assert len(response.data["account_number"]) == 10


@pytest.mark.django_db
def test_bank_webhook_amount_mismatch(api_client, create_staff_user, settings):
    user = create_staff_user()
    settings.BANK_WEBHOOK_SECRET = "testsecret"
    
    # Pre-create VA
    va = VirtualAccount.objects.create(staff=user, cycle="2026", amount_due=5000)
    
    url = reverse("bank_webhook")
    payload = {
        "account_number": va.account_number,
        "amount": 4000.00,  # mismatch
        "tx_ref": "TXN_MISMATCH_123"
    }
    
    body = json.dumps(payload).encode()
    signature = hmac.new("testsecret".encode(), body, hashlib.sha256).hexdigest()
    
    response = api_client.post(
        url,
        data=payload,
        format="json",
        HTTP_X_BANK_SIGNATURE=signature
    )
    
    assert response.status_code == 200
    assert response.data["status"] == "rejected"
    
    va.refresh_from_db()
    assert va.status == "failed"
