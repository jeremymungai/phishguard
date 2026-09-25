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
        action = "ALLOW: Deliver normally to user inbox"
        human_required = False

        # --- Rule 1: Deterministic Hard Overrides ---
        if dangerous_att:
            reasons.append("Deterministic rule: Executable/macro attachment detected")
            verdict = "QUARANTINE_RECOMMENDATION"
            action = "QUARANTINE_RECOMMENDATION: Isolate weaponized attachment from user inbox"
            human_required = True
            return {
                "verdict": verdict,
                "recommended_action": action,
                "reasons": reasons,
                "human_review_required": human_required
            }

        if lookalikes and auth_dmarc == "FAIL":
            reasons.append(f"Deterministic rule: Confirmed brand lookalike domain ({', '.join(lookalikes)}) with failed DMARC")
            verdict = "QUARANTINE_RECOMMENDATION"
            action = "QUARANTINE_RECOMMENDATION: Brand impersonation with spoofed email authentication"
            human_required = True
            return {
                "verdict": verdict,
                "recommended_action": action,
                "reasons": reasons,
                "human_review_required": human_required
            }

        # --- Rule 2: High Threat / Credential Theft / Malicious Link ---
        if (jev_risk >= POLICY_RISK_THRESHOLD_HIGH and cred_theft >= POLICY_CREDENTIAL_THEFT_THRESHOLD):
            reasons.append(f"Jev risk score ({jev_risk}/5.0) and credential theft probability ({cred_theft:.2f}) exceed thresholds")
            verdict = "QUARANTINE_RECOMMENDATION"
            action = "QUARANTINE_RECOMMENDATION: High-confidence credential harvesting attack"
            human_required = True

        elif (jev_risk >= POLICY_RISK_THRESHOLD_HIGH and mal_url >= POLICY_MALICIOUS_URL_THRESHOLD):
            reasons.append(f"Jev risk score ({jev_risk}/5.0) and malicious URL probability ({mal_url:.2f}) exceed thresholds")
            verdict = "QUARANTINE_RECOMMENDATION"
            action = "QUARANTINE_RECOMMENDATION: Malicious link infrastructure detected"
            human_required = True

        # --- Rule 3: Business Email Compromise or Escalation ---
        elif bec_prob >= POLICY_BEC_THRESHOLD or human_review >= POLICY_HUMAN_REVIEW_THRESHOLD:
            reasons.append(f"BEC probability ({bec_prob:.2f}) or analyst escalation recommendation ({human_review:.2f}) triggered")
            verdict = "ESCALATE"
            action = "ESCALATE: Flagged for high-priority Tier-2 SOC Analyst inspection"
            human_required = True

        elif jev_risk >= POLICY_RISK_THRESHOLD_HIGH:
            reasons.append(f"Elevated risk score ({jev_risk}/5.0) without specific quarantine rule")
            verdict = "ESCALATE"
            action = "ESCALATE: Security review required before delivery"
            human_required = True

        # --- Rule 4: Moderate Risk or Spam ---
        elif classification == "spam" or jev_risk >= 2.2 or det_risk >= 0.20:
            reasons.append(f"Low-to-moderate risk (Jev: {jev_risk}/5.0, Det: {det_risk:.2f})")
            if classification == "spam":
                reasons.append("Unsolicited bulk marketing/spam indicators present")
            verdict = "MONITOR"
            action = "MONITOR: Deliver with external sender warning banner and record telemetry"
            human_required = False

        # --- Rule 5: Legitimate ---
        else:
            reasons.append("Authentication passed with no deceptive patterns or threat indicators")
            verdict = "ALLOW"
            action = "ALLOW: Deliver normally to user inbox"
            human_required = False

        return {
            "verdict": verdict,
            "recommended_action": action,
            "reasons": reasons,
            "human_review_required": human_required
        }