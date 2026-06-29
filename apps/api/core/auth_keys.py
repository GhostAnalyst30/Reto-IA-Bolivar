"""Auth key validation."""
import bcrypt
from datetime import datetime, timezone


def hash_auth_key(plain_key: str) -> str:
    return bcrypt.hashpw(plain_key.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_auth_key(plain_key: str, key_hash: str) -> bool:
    try:
        return bcrypt.checkpw(plain_key.encode(), key_hash.encode())
    except Exception:
        return False


def is_key_valid(record: dict) -> bool:
    if record.get("revoked_at"):
        return False
    expires = record.get("expires_at")
    if expires:
        exp = datetime.fromisoformat(expires.replace("Z", "+00:00"))
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < datetime.now(timezone.utc):
            return False
    if record.get("max_uses") and record.get("uses_count", 0) >= record["max_uses"]:
        return False
    return True
