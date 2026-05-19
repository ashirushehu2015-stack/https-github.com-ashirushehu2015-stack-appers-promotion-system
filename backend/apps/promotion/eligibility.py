from datetime import date
from dateutil.relativedelta import relativedelta


def get_required_years(grade_level):
    """
    Returns required maturity years based on grade level string.
    GL 01 - 06: 2 years
    GL 07 - 13: 3 years
    GL 14 - 16: 4 years
    """
    try:
        # Strip any leading zeros or special characters
        gl = int("".join(filter(str.isdigit, str(grade_level))))
    except ValueError:
        return 3  # default fallback if malformed

    if 1 <= gl <= 6:
        return 2.0
    elif 7 <= gl <= 13:
        return 3.0
    elif 14 <= gl <= 16:
        return 4.0
    else:
        return 3.0  # default fallback for high levels or others


def calculate_years_in_post(last_promotion_date):
    """Calculates years from last_promotion_date to today."""
    if not last_promotion_date:
        return 99.0  # If never promoted or no date, assume they are eligible
    today = date.today()
    diff = relativedelta(today, last_promotion_date)
    return diff.years + (diff.months / 12.0) + (diff.days / 365.0)


def check_eligibility(user):
    """Checks overall maturity eligibility for a user."""
    years = calculate_years_in_post(user.last_promotion_date)
    req = get_required_years(user.grade_level)
    return {
        "grade_level": user.grade_level,
        "years_in_post": round(years, 2),
        "required_years": req,
        "is_eligible": years >= req
    }
