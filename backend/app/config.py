import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")

TYPESAFE_API_KEY = os.getenv("TYPESAFE_API_KEY", "").strip()
TYPESAFE_BASE_URL = os.getenv("TYPESAFE_BASE_URL", "https://api.typesafe.ai/v1")

def is_api_key_configured() -> bool:
    if not TYPESAFE_API_KEY:
        return False
    if "your_" in TYPESAFE_API_KEY.lower() or "api_key" in TYPESAFE_API_KEY.lower() or len(TYPESAFE_API_KEY) < 15:
        return False
    return True

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/phishguard.db")
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))

POLICY_RISK_THRESHOLD_HIGH = float(os.getenv("POLICY_RISK_THRESHOLD_HIGH", "3.8"))
POLICY_RISK_THRESHOLD_CRITICAL = float(os.getenv("POLICY_RISK_THRESHOLD_CRITICAL", "4.5"))
POLICY_CREDENTIAL_THEFT_THRESHOLD = float(os.getenv("POLICY_CREDENTIAL_THEFT_THRESHOLD", "0.70"))
POLICY_MALICIOUS_URL_THRESHOLD = float(os.getenv("POLICY_MALICIOUS_URL_THRESHOLD", "0.70"))
POLICY_BEC_THRESHOLD = float(os.getenv("POLICY_BEC_THRESHOLD", "0.65"))
POLICY_HUMAN_REVIEW_THRESHOLD = float(os.getenv("POLICY_HUMAN_REVIEW_THRESHOLD", "0.60"))

RAW_EMAIL_STORAGE_ENABLED = os.getenv("RAW_EMAIL_STORAGE_ENABLED", "false").lower() == "true"
MAX_EMAIL_BODY_SIZE_BYTES = int(os.getenv("MAX_EMAIL_BODY_SIZE_BYTES", str(1024 * 1024 * 5)))