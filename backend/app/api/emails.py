from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models import EmailRecord, AnalysisResult, AuditLog
from app.schemas import (
    EmailInputRaw,
    EmailInputStructured,
    EmailSummaryResponse,
    AnalystFeedbackRequest
)
from app.services.pipeline import process_email_pipeline
from app.api.events import broadcast_event

router = APIRouter()

@router.post("/analyze-raw")
def analyze_raw_email(input_data: EmailInputRaw, db: Session = Depends(get_db)):
    """Analyze a pasted raw RFC 5322 .eml string."""
    try:
        result = process_email_pipeline(db, raw_eml=input_data.raw_eml, is_simulation=True)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse and analyze email: {str(e)}")

@router.post("/upload-eml")
async def upload_eml_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a .eml file directly from disk for analysis."""
    try:
        content_bytes = await file.read()
        result = process_email_pipeline(db, raw_eml=content_bytes, is_simulation=True)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process uploaded file: {str(e)}")

@router.post("/analyze-json")
def analyze_json_email(input_data: EmailInputStructured, db: Session = Depends(get_db)):
    """Analyze a structured JSON payload representing an email."""
    try:
        result = process_email_pipeline(db, structured_data=input_data.model_dump(), is_simulation=True)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to analyze email: {str(e)}")

@router.get("", response_model=list[EmailSummaryResponse])
def list_emails(
    verdict: Optional[str] = None,
    classification: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Lists analyzed emails for the SOC triage queue."""
    query = db.query(EmailRecord).join(AnalysisResult)
    if verdict:
        query = query.filter(AnalysisResult.policy_verdict == verdict)
    if classification:
        query = query.filter(AnalysisResult.jev_decision["classification"].as_string() == classification)
    
    records = query.order_by(desc(EmailRecord.received_at)).limit(limit).all()

    summaries = []
    for r in records:
        analysis = r.analysis
        summaries.append(EmailSummaryResponse(
            id=r.id,
            sender=r.sender,
            recipient=r.recipient,
            subject=r.subject or "(No Subject)",
            received_at=r.received_at,
            classification=analysis.jev_decision.get("classification", "unknown") if analysis else "unknown",
            risk_score=analysis.jev_decision.get("risk_score", 0.0) if analysis else 0.0,
            policy_verdict=analysis.policy_verdict if analysis else "UNKNOWN",
            policy_action=analysis.policy_action if analysis else "None",
            analyst_verdict=analysis.analyst_verdict if analysis else None,
            status=r.status
        ))
    return summaries

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Computes high-level overview metrics for the SOC dashboard."""
    total = db.query(EmailRecord).count()
    quarantine_count = db.query(AnalysisResult).filter(AnalysisResult.policy_verdict == "QUARANTINE_RECOMMENDATION").count()
    escalated_count = db.query(AnalysisResult).filter(AnalysisResult.policy_verdict == "ESCALATE").count()
    monitored_count = db.query(AnalysisResult).filter(AnalysisResult.policy_verdict == "MONITOR").count()
    allowed_count = db.query(AnalysisResult).filter(AnalysisResult.policy_verdict == "ALLOW").count()
    
    # Needs human review
    pending_review = db.query(AnalysisResult).filter(
        AnalysisResult.analyst_verdict.is_(None),
        AnalysisResult.policy_verdict.in_(["QUARANTINE_RECOMMENDATION", "ESCALATE"])
    ).count()

    return {
        "total_analyzed": total,
        "quarantine_count": quarantine_count,
        "escalated_count": escalated_count,
        "monitored_count": monitored_count,
        "allowed_count": allowed_count,
        "pending_human_review": pending_review,
    }

@router.get("/{email_id}")
def get_email_detail(email_id: str, db: Session = Depends(get_db)):
    """Retrieves full detail for an email, including signals, Jev breakdown, and audit log."""
    record = db.query(EmailRecord).filter(EmailRecord.id == email_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Email record not found")

    analysis = record.analysis
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis result not found")

    audits = db.query(AuditLog).filter(AuditLog.email_id == email_id).order_by(AuditLog.timestamp).all()

    return {
        "id": record.id,
        "sender": record.sender,
        "recipient": record.recipient,
        "subject": record.subject,
        "received_at": record.received_at,
        "status": record.status,
        "features": analysis.extracted_features,
        "jev": analysis.jev_decision,
        "policy": {
            "verdict": analysis.policy_verdict,
            "recommended_action": analysis.policy_action,
            "reasons": analysis.policy_reasons,
        },
        "analyst": {
            "verdict": analysis.analyst_verdict,
            "notes": analysis.analyst_notes,
            "reviewed_at": analysis.reviewed_at,
        },
        "latency_ms": analysis.latency_ms,
        "audit_logs": [
            {
                "event_type": a.event_type,
                "details": a.details,
                "timestamp": a.timestamp.isoformat(),
            }
            for a in audits
        ]
    }

@router.post("/{email_id}/feedback")
def submit_analyst_feedback(
    email_id: str,
    feedback: AnalystFeedbackRequest,
    db: Session = Depends(get_db)
):
    """
    Records human-in-the-loop analyst feedback.
    Valid choices: CONFIRMED_PHISH, LEGITIMATE, ESCALATED, IGNORED
    """
    analysis = db.query(AnalysisResult).filter(AnalysisResult.email_id == email_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Email analysis not found")

    analysis.analyst_verdict = feedback.verdict
    analysis.analyst_notes = feedback.notes
    analysis.reviewed_at = datetime.now(timezone.utc)

    # Update email record status
    record = db.query(EmailRecord).filter(EmailRecord.id == email_id).first()
    if record:
        record.status = "REVIEWED"

    # Add audit log
    audit = AuditLog(
        email_id=email_id,
        event_type="ANALYST_FEEDBACK",
        details=f"Analyst classified as {feedback.verdict}. Notes: {feedback.notes or 'None'}"
    )
    db.add(audit)
    db.commit()

    broadcast_event({
        "event": "analyst_feedback",
        "email_id": email_id,
        "analyst_verdict": feedback.verdict,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    return {"status": "success", "analyst_verdict": feedback.verdict}