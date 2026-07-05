"""Validación y utilidades de username."""
import re

USERNAME_PATTERN = re.compile(r"^[a-z][a-z0-9_]{2,29}$")
UTB_EMAIL_SUFFIX = "@utb.edu.co"


def normalize_username(raw: str) -> str:
    return raw.strip().lower()


def is_valid_username(username: str) -> bool:
    return bool(USERNAME_PATTERN.match(normalize_username(username)))


def is_utb_email(email: str) -> bool:
    return email.strip().lower().endswith(UTB_EMAIL_SUFFIX)


def suggest_usernames(base: str, taken: set[str]) -> list[str]:
    normalized = normalize_username(base)
    normalized = re.sub(r"[^a-z0-9_]", "", normalized) or "usuario"
    root = normalized[:28]
    suggestions: list[str] = []
    for i in range(1, 20):
        candidate = f"{root}{i}"
        if candidate not in taken and is_valid_username(candidate):
            suggestions.append(candidate)
        if len(suggestions) >= 3:
            break
    return suggestions
