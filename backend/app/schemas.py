from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field

class NormalizedURL(BaseModel):
    original_url: str
    normalized_url: str
    hostname: str
    registrable_domain: str
    scheme: str
    is_https: bool
    is_lookalike: bool = False
    lookalike_target: Optional[str] = None
    has_login_keywords: bool = False
    suspicious_tld: bool = False

class AttachmentMetadata(BaseModel):
    filename: str
    mime_type: str
    size_bytes: int
    sha256_hash: str
    is_dangerous_type: bool = False

class DeterministicSignals(BaseModel):
    spf_result: str = "NONE" # PASS, FAIL, SOFTFAIL, NEUTRAL, NONE
    dkim_result: str = "NONE" # PASS, FAIL, NONE
    dmarc_result: str = "NONE" # PASS, FAIL, NONE
    reply_to_mismatch: bool = False
    display_name_spoofing: bool = False
    suspicious_tld_detected: bool = False
    lookalike_domains: list[str] = Field(default_factory=list)
    urgency_keywords: list[str] = Field(default_factory=list)
    financial_keywords: list[str] = Field(default_factory=list)
    credential_keywords: list[str] = Field(default_factory=list)
    suspicious_url_count: int = 0
    dangerous_attachment_count: int = 0
    deterministic_risk_score: float = 0.0

class ExtractedFeatures(BaseModel):
    sender: dict[str, Any]
    recipient: str
    subject: str
    date: Optional[str] = None
    message_id: Optional[str] = None
    authentication: dict[str, str]
    urls: list[NormalizedURL] = Field(default_factory=list)
    attachments: list[AttachmentMetadata] = Field(default_factory=list)
    signals: DeterministicSignals
    body_preview: str = ""

class JevDecision(BaseModel):
    classification: str # legitimate, spam, phishing, business_email_compromise, malware
    classification_confidence: float
    classification_probabilities: dict[str, float]
    credential_theft_prob: float
    bec_prob: float
    malicious_url_prob: float
    risk_score: float # 1.0 - 5.0
    human_review_prob: float
    latency_ms: float
    model: str
    is_live_api: bool

class PolicyVerdict(BaseModel):
    verdict: str # ALLOW, MONITOR, ESCALATE, QUARANTINE_RECOMMENDATION
    recommended_action: str
    action_steps: list[str] = Field(default_factory=list)
    reasons: list[str] = Field(default_factory=list)
    human_review_required: bool = False

class EmailAnalysisResponse(BaseModel):
    id: str
    sender: str
    recipient: str
    subject: str
    received_at: datetime
    sanitized_html: str
    plain_text: str
    features: ExtractedFeatures
    jev: JevDecision
    policy: PolicyVerdict
    analyst_verdict: Optional[str] = None
    analyst_notes: Optional[str] = None
    status: str
    latency_ms: float

class EmailSummaryResponse(BaseModel):
    id: str
    sender: str
    recipient: str
    subject: str
    received_at: datetime
    classification: str
    risk_score: float
    policy_verdict: str
    policy_action: str
    analyst_verdict: Optional[str] = None
    status: str

class AnalystFeedbackRequest(BaseModel):
    verdict: str # CONFIRMED_PHISH, LEGITIMATE, ESCALATED, IGNORED
    notes: Optional[str] = None

class EmailInputRaw(BaseModel):
    raw_eml: str

class EmailInputStructured(BaseModel):
    from_address: str
    to_address: str
    subject: str
    body_text: str
    body_html: Optional[str] = ""
    reply_to: Optional[str] = None
    message_id: Optional[str] = None
    date: Optional[str] = None
    authentication_results: Optional[str] = None
    attachments: list[dict[str, Any]] = Field(default_factory=list)