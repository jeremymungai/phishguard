from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.services.pipeline import process_email_pipeline

def test_pipeline_simulation_run():
    # In-memory test SQLite db
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    structured_data = {
        "from_address": "Microsoft IT <support@login-micros0ft.com>",
        "to_address": "user@corporate.local",
        "subject": "CRITICAL: Password Expired - Reset Immediately",
        "body_text": "Please reset your password immediately: https://login-micros0ft.com/auth/login",
        "body_html": "<a href=\"https://login-micros0ft.com/auth/login\">Reset Password</a>",
        "authentication_results": "spf=fail dkim=none dmarc=fail"
    }

    result = process_email_pipeline(db, structured_data=structured_data, is_simulation=True)

    assert result["id"] is not None
    assert result["policy"]["verdict"] == "QUARANTINE_RECOMMENDATION"
    assert result["jev"]["classification"] == "phishing"
    assert result["jev"]["credential_theft_prob"] > 0.7
    assert result["latency_ms"] > 0