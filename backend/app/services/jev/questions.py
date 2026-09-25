from typesafe_sdk import Choice, Noul, Score

CLASSIFICATION_CRITERIA = {
    "legitimate": "Legitimate business, operational, or personal email from an authenticated sender with no deceptive intent",
    "spam": "Unsolicited bulk email, commercial advertising, or benign promotional material without credential theft or malware delivery",
    "phishing": "Deceptive email attempting credential harvesting, fraudulent link redirection, or sensitive info theft",
    "business_email_compromise": "Targeted executive impersonation, fraudulent wire transfer, or unauthorized payroll/gift card diversion",
    "malware": "Delivery of malicious payload, weaponized attachments, script execution, or trojan dropper"
}

RISK_RUBRIC = [
    "1. Very low: Clearly benign with zero suspicious signals",
    "2. Low: Routine email with minor marketing or neutral anomalies",
    "3. Moderate: Ambiguous intent or unusual sender requiring scrutiny",
    "4. High: Strong indicators of credential theft, impersonation, or deceptive URLs",
    "5. Critical: Active attack with confirmed deceptive infrastructure, credential harvesting, or weaponized payload"
]

def build_phishguard_questions() -> dict:
    """
    Returns the atomic, typed question set for TypeSafe AI Jev System-1 model.
    """
    return {
        "classification": Choice(
            instructions="Classify this email into exactly one security category based on intent and content.",
            criteria=CLASSIFICATION_CRITERIA
        ),
        "credential_theft": Noul(
            instructions="Does this email attempt to obtain credentials, authentication information, passwords, MFA codes, or session information?"
        ),
        "malicious_url": Noul(
            instructions="Is there sufficient evidence that one or more URLs in this email should be treated as suspicious or potentially malicious?"
        ),
        "bec": Noul(
            instructions="Does this email appear to be a business email compromise or impersonation attempt intended to cause an unauthorized business action?"
        ),
        "risk": Score(
            instructions="Rate the overall security threat and risk severity of this email on a 5-point rubric.",
            criteria=RISK_RUBRIC
        ),
        "human_review": Noul(
            instructions="Should this email be escalated to a human security analyst?"
        )
    }