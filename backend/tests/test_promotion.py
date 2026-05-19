import pytest
from datetime import date, timedelta
from apps.promotion.eligibility import get_required_years, calculate_years_in_post, check_eligibility


def test_required_years_maturity():
    assert get_required_years("04") == 2.0
    assert get_required_years("GL 08") == 3.0
    assert get_required_years("GL 15") == 4.0


def test_years_in_post_calculation():
    # 3 years ago
    three_years_ago = date.today() - timedelta(days=3 * 365)
    years = calculate_years_in_post(three_years_ago)
    assert round(years) == 3


@pytest.mark.django_db
def test_check_eligibility_engine(create_staff_user):
    user = create_staff_user()
    user.grade_level = "08"
    
    # 2 years ago (not enough for GL 8 which requires 3)
    user.last_promotion_date = date.today() - timedelta(days=2 * 365)
    res = check_eligibility(user)
    assert res["is_eligible"] is False
    
    # 4 years ago (enough for GL 8)
    user.last_promotion_date = date.today() - timedelta(days=4 * 365)
    res = check_eligibility(user)
    assert res["is_eligible"] is True
