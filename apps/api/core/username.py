"""Validación de correo institucional UTB."""

UTB_EMAIL_SUFFIX = "@utb.edu.co"


def is_utb_email(email: str) -> bool:
    return email.strip().lower().endswith(UTB_EMAIL_SUFFIX)
