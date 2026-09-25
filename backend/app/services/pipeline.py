import time
from typing import Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models import EmailRecord, AnalysisResult, AuditLog
from app.services.email.parser import parse_raw_eml
from app.services.analysis.deterministic import analyze_deterministic_features
from app.services.jev.client import evaluate_with_jev
from app.services.policy.engine import PolicyEngine
from app.api.events import broadcast_event

def process_email_pipeline(
    db: Session,
    raw_eml: Optional[str] = None,
    structured_data: Optional[dict[str, Any]] = None,
    is_simulation: bool = True
) -> dict[str, Any]:
    """
    Executes the end-to-end PhishGuard analysis pipeline:
    INGESTION -> PARSER -> DETERMINISTIC ANALYSIS -> JEV -> POLICY ENGINE -> DB STORE -> EVENT BROADCAST
    """
    start_total_time = time.perf_counter()

    # 1. Parse Email
    if raw_eml:
        parsed = parse_raw_eml(raw_eml)
    elif structured_data:
        # Build compatible parsed dict from structured input
        from email.utils import parseaddr
        from app.services.email.sanitizer import sanitize_email_html

        from_raw = structured_data.get("from_address", "")
        from_display, from_email = parseaddr(from_raw)
        from_domain = from_email.split("@")[-1].lower() if "@" in from_email else ""

        to_raw = structured_data.get("to_address", "")
        _, to_email = parseaddr(to_raw)

        parsed = {
            "headers": {
                "from_raw": from_raw,
                "from_display": from_display,
                "from_email": from_email,
                "from_domain": from_domain,
                "to_raw": to_raw,
                "to_email": to_email,
                "reply_to_email": structured_data.get("reply_to", ""),
                "reply_to_display": "",
                "subject": structured_data.get("subject", ""),
                "date": structured_data.get("date", datetime.now(timezone.utc).isoformat()),
                "message_id": structured_data.get("message_id", f"sim-{time.time()}"),
                "authentication_results": structured_data.get("authentication_results", ""),
                "received_spf": "",
                "received_count": 1,
            },
            "plain_text": structured_data.get("body_text", ""),
            "sanitized_html": sanitize_email_html(structured_data.get("body_html", "")),
            "attachments": structured_data.get("attachments", []),
        }
    else:
        raise ValueError("Must provide either raw_eml or structured_data")

    # 2. Extract Deterministic Features
    features = analyze_deterministic_features(parsed)

    # 3. Jev Semantic Decision Evaluation
    jev_result = evaluate_with_jev(features)

    # 4. Policy Engine Verdict
    policy_verdict = PolicyEngine.evaluate_policy(features, jev_result)

    total_latency_ms = round((time.perf_counter() - start_total_time) * 1000, 2)

    # 5. Store in Database
    email_record = EmailRecord(
        sender=features["sender"]["from_email"] or "unknown@sender",
        sender_domain=features["sender"]["from_domain"] or "unknown",
        recipient=features["recipient"] or "user@company.local",
        subject=features["subject"],
        message_id=features["message_id"],
        is_simulation=is_simulation,
        status="ANALYZED"
    )
    db.add(email_record)
    db.flush()

    analysis_record = AnalysisResult(
        email_id=email_record.id,
        extracted_features=features,
        jev_decision=jev_result,
        policy_verdict=policy_verdict["verdict"],
        policy_action=policy_verdict["recommended_action"],
        policy_reasons=policy_verdict["reasons"],
        latency_ms=total_latency_ms
    )
    db.add(analysis_record)

    # Add audit log entries
    audit1 = AuditLog(
        email_id=email_record.id,
        event_type="INGESTION_AND_PARSE",
        details=f"Email ingested from {email_record.sender} to {email_record.recipient}. Subject: {email_record.subject}"
    )
    audit2 = AuditLog(
        email_id=email_record.id,
        event_type="JEV_EVALUATION",
        details=f"Jev classified as {jev_result['classification']} with risk score {jev_result['risk_score']}/5.0 (latency: {jev_result['latency_ms']}ms)"
    )
    audit3 = AuditLog(
        email_id=email_record.id,
        event_type="POLICY_ENFORCED",
        details=f"Policy decision: {policy_verdict['verdict']} -> {policy_verdict['recommended_action']}"
    )
    db.add_all([audit1, audit2, audit3])
    db.commit()
    db.refresh(email_record)

    # 6. Broadcast Real-Time SSE Event
    broadcast_event({
        "event": "email_analyzed",
        "email_id": email_record.id,
        "sender": email_record.sender,
        "subject": email_record.subject,
        "classification": jev_result["classification"],
        "risk_score": jev_result["risk_score"],
        "policy_verdict": policy_verdict["verdict"],
        "latency_ms": total_latency_ms,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    return {
        "id": email_record.id,
        "sender": email_record.sender,
        "recipient": email_record.recipient,
        "subject": email_record.subject,
        "received_at": email_record.received_at,
        "sanitized_html": parsed["sanitized_html"],
        "plain_text": parsed["plain_text"],
        "features": features,
        "jev": jev_result,
        "policy": policy_verdict,
        "analyst_verdict": None,
        "analyst_notes": None,
        "status": email_record.status,
        "latency_ms": total_latency_ms,
    }