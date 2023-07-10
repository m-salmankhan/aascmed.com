from typing import Tuple, Optional

from email_validator import validate_email, EmailNotValidError


# return tuple of (err_msg, normalised_email)
def check_valid_email(email: str) -> Tuple[Optional[str], Optional[str]]:
    try:
        email_info = validate_email(email, check_deliverability=True)
        return None, email_info.normalized
    except EmailNotValidError as e:
        return str(e), None


def check_required_field_present(value: str) -> bool:
    return len(value) > 0
