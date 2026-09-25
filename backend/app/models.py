import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Boolean, Float, Text, ForeignKey, Integer, JSON
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class EmailRecord(Base):
    __tablename__ = "emails"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    sender = Column(String(255), nullable=False)
    sender_domain = Column(String(255), index=True)
    recipient = Column(String(255), nullable=False)
    subject = Column(String(500), default="")
    received_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    message_id = Column(String(255), index=True, nullable=True)
    is_simulation = Column(Boolean, default=True)
    status = Column(String(50), default="RECEIVED")  # RECEIVED, ANALYZED, REVIEWED, FAILED
    
    # Relationships
    analysis = relationship("AnalysisResult", back_populates="email", uselist=False, cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="email", cascade="all, delete-orphan")

class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email_id = Column(String(36), ForeignKey("emails.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Structured Features & Results
    extracted_features = Column(JSON, nullable=False)
    jev_decision = Column(JSON, nullable=False)
    
    # Policy Decisions
    policy_verdict = Column(String(50), nullable=False, index=True) # ALLOW, MONITOR, ESCALATE, QUARANTINE_RECOMMENDATION
    policy_action = Column(String(255), nullable=False)
    policy_reasons = Column(JSON, default=list)
    
    # Human-in-the-Loop Analyst Review
    analyst_verdict = Column(String(50), nullable=True)  # CONFIRMED_PHISH, LEGITIMATE, ESCALATED, IGNORED
    analyst_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    
    latency_ms = Column(Float, default=0.0)
    analyzed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    email = relationship("EmailRecord", back_populates="analysis")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email_id = Column(String(36), ForeignKey("emails.id", ondelete="CASCADE"), nullable=True, index=True)
    event_type = Column(String(100), nullable=False, index=True) # INGESTION, PARSED, JEV_ANALYSIS, POLICY_APPLIED, ANALYST_FEEDBACK
    details = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    email = relationship("EmailRecord", back_populates="audit_logs")