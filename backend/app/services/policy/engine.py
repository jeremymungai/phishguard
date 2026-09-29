from typing import Any
from app.config import (
    POLICY_RISK_THRESHOLD_HIGH,
    POLICY_RISK_THRESHOLD_CRITICAL,
    POLICY_CREDENTIAL_THEFT_THRESHOLD,
    POLICY_MALICIOUS_URL_THRESHOLD,
    POLICY_BEC_THRESHOLD,
    POLICY_HUMAN_REVIEW_THRESHOLD
)

class PolicyEngine:
    """
    Enforces organization security policy.
    Owns authorization, threshold logic, and final action recommendations.
    Jev provides semantic recommendations; this engine owns the final operational verdict.
    """

    @staticmethod
    def evaluate_policy(features: dict[str, Any], jev: dict[str, Any]) -> dict[str, Any]:
        signals = features.get("signals", {})
        det_risk = signals.get("deterministic_risk_score", 0.0)
        dangerous_att = signals.get("dangerous_attachment_count", 0) > 0
        lookalikes = signals.get("lookalike_domains", [])
        auth_dmarc = signals.get("dmarc_result", "NONE")

        jev_risk = jev.get("risk_score", 1.0)
        cred_theft = jev.get("credential_theft_prob", 0.0)
        mal_url = jev.get("malicious_url_prob", 0.0)
        bec_prob = jev.get("bec_prob", 0.0)
        human_review = jev.get("human_review_prob", 0.0)
        classification = jev.get("classification", "legitimate")

        reasons = []
        verdict = "ALLOW"
        action = "SAFE TO READ: Normal legitimate email with verified sender authentication."
        action_steps = [
            "Safe to read, reply, and interact with normally.",
            "As standard practice, always double-check unexpected requests for money, gift cards, or credentials."
        ]
        human_required = False

        # --- Rule 1: Deterministic Hard Overrides ---
        if dangerous_att:
            reasons.append("Deterministic rule: Dangerous file format (executable or macro) detected in attachment")
            verdict = "QUARANTINE_RECOMMENDATION"
            action = "AVOID & DELETE: Do not open or download attachments. Dangerous file detected."
            action_steps = [
                "Do not open, download, or preview any attachments — dangerous files can infect your device with malware.",
                "Do not reply or forward this message to friends, colleagues, or contacts.",
                "Mark as Phishing / Spam in your email client and delete the email immediately.",
                "If you already opened the attachment, disconnect your device from the internet and run an antivirus scan."
            ]
            human_required = True
            return {
                "verdict": verdict,
                "recommended_action": action,
                "action_steps": action_steps,
                "reasons": reasons,
                "human_review_required": human_required
            }

        if lookalikes and auth_dmarc == "FAIL":
            reasons.append(f"Deterministic rule: Confirmed brand impersonation ({', '.join(lookalikes)}) with failed email authentication")
            verdict = "QUARANTINE_RECOMMENDATION"
            action = f"AVOID & DELETE: Sender is pretending to be a real brand ({', '.join(lookalikes)}). Do not click any links."
            action_steps = [
                "Avoid clicking any links, buttons, or images — the sender domain is spoofing a real service.",
                "Never enter passwords, credit card info, or personal details on pages from this email.",
                "Mark as Phishing / Spam in your email app and delete the message.",
                "To access your account safely, open your browser and navigate directly to the brand's official website."
            ]
            human_required = True
            return {
                "verdict": verdict,
                "recommended_action": action,
                "action_steps": action_steps,
                "reasons": reasons,
                "human_review_required": human_required
            }

        # --- Rule 2: High Threat / Credential Theft / Malicious Link ---
        if (jev_risk >= POLICY_RISK_THRESHOLD_HIGH and cred_theft >= POLICY_CREDENTIAL_THEFT_THRESHOLD):
            reasons.append(f"High risk score ({jev_risk}/5.0) and password theft indicators detected")
            verdict = "QUARANTINE_RECOMMENDATION"
            action = "AVOID & DELETE: High-risk phishing attempt designed to steal your passwords or account access."
            action_steps = [
                "Do not click any login, account verification, or password reset links.",
                "Never share your passwords, PINs, or one-time verification codes (2FA/OTP).",
                "Mark as Phishing and permanently delete this email from your inbox.",
                "If you already entered your credentials, immediately change your password on the official website."
            ]
            human_required = True

        elif (jev_risk >= POLICY_RISK_THRESHOLD_HIGH and mal_url >= POLICY_MALICIOUS_URL_THRESHOLD):
            reasons.append(f"High risk score ({jev_risk}/5.0) and suspicious link infrastructure detected")
            verdict = "QUARANTINE_RECOMMENDATION"
            action = "AVOID & DELETE: Malicious link detected. Do not click links or buttons."
            action_steps = [
                "Do not tap or click any links or buttons inside this message.",
                "Do not reply, fill out forms, or interact with the sender.",
                "Report this email as Phishing / Junk in your mail app and delete it.",
                "If you clicked a link, close the browser tab immediately and avoid downloading any files."
            ]
            human_required = True

        # --- Rule 3: Business Email Compromise or Escalation ---
        elif bec_prob >= POLICY_BEC_THRESHOLD or human_review >= POLICY_HUMAN_REVIEW_THRESHOLD:
            reasons.append("Signs of identity impersonation, urgent money request, or unusual instruction detected")
            verdict = "ESCALATE"
            action = "VERIFY SENDER: Contact the sender through a known, trusted phone number before taking action."
            action_steps = [
                "Do not reply directly to this email — the sender address or display name may be impersonated.",
                "Never transfer funds, purchase gift cards, or share sensitive data based solely on an email request.",
                "Verify the request directly by calling the person using a phone number you already know and trust.",
                "If this is a work email, verify with your manager or team; if personal, treat as unsolicited and ignore."
            ]
            human_required = True

        elif jev_risk >= POLICY_RISK_THRESHOLD_HIGH:
            reasons.append(f"Elevated risk score ({jev_risk}/5.0) with unusual sender or content patterns")
            verdict = "ESCALATE"
            action = "PROCEED WITH CAUTION: Email contains unusual patterns. Verify legitimacy before interacting."
            action_steps = [
                "Carefully inspect the sender's full email address (not just their display name).",
                "Avoid clicking embedded links; instead, go directly to the official service website.",
                "Do not share confidential information, passwords, or personal data.",
                "If in doubt, contact the sender through a separate, trusted channel to confirm."
            ]
            human_required = True

        # --- Rule 4: Moderate Risk or Spam ---
        elif classification == "spam" or jev_risk >= 2.2 or det_risk >= 0.20:
            reasons.append("Unsolicited bulk marketing or spam indicators present")
            verdict = "MONITOR"
            action = "IGNORE & MARK SPAM: Likely unsolicited bulk marketing or spam. Do not engage."
            action_steps = [
                "Avoid clicking unsubscribe or promotional links if you don't recognize the sender.",
                "Do not reply to the email — replying confirms your inbox is active to spammers.",
                "Mark as Spam / Junk in your email app to help filter future unwanted messages, then delete."
            ]
            human_required = False

        # --- Rule 5: Legitimate ---
        else:
            reasons.append("Authentication passed with no deceptive patterns or threat indicators")
            verdict = "ALLOW"
            action = "SAFE TO READ: Normal legitimate email with verified sender authentication."
            action_steps = [
                "Safe to read, reply, and interact with normally.",
                "As standard practice, always double-check unexpected requests for money, gift cards, or credentials."
            ]
            human_required = False

        return {
            "verdict": verdict,
            "recommended_action": action,
            "action_steps": action_steps,
            "reasons": reasons,
            "human_review_required": human_required
        }