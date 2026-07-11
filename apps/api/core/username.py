"""Validación de correo institucional UTB."""

UTB_EMAIL_SUFFIX = "@utb.edu.co"

# Excepción temporal de dominio para pruebas fuera de @utb.edu.co
UTB_EMAIL_EXCEPTIONS = frozenset({"ascendraemmanuel@gmail.com"})


def is_utb_email(email: str) -> bool:
    normalized = email.strip().lower()
    return normalized.endswith(UTB_EMAIL_SUFFIX) or normalized in UTB_EMAIL_EXCEPTIONS
