from app.services.policy.engine import PolicyEngine

def test_policy_quarantine_for_credential_harvest():
    features = {
        "signals": {
            "deterministic_risk_score": 0.5,
            "dangerous_attachment_count": 0,
            "lookalike_domains": ["login-micros0ft.com"],
            "dmarc_result": "FAIL"
        }
    }
    jev = {
        "classification": "phishing",
        "risk_score": 4.6,
        "credential_theft_prob": 0.95,
        "malicious_url_prob": 0.90,
        "bec_prob": 0.05,
        "human_review_prob": 0.90
    }
    verdict = PolicyEngine.evaluate_policy(features, jev)
    assert verdict["verdict"] == "QUARANTINE_RECOMMENDATION"
    assert verdict["human_review_required"] is True

def test_policy_allow_for_clean_email():
    features = {
        "signals": {
            "deterministic_risk_score": 0.05,
            "dangerous_attachment_count": 0,
            "lookalike_domains": [],
            "dmarc_result": "PASS"
        }
    }
    jev = {
        "classification": "legitimate",
        "risk_score": 1.2,
        "credential_theft_prob": 0.02,
        "malicious_url_prob": 0.03,
        "bec_prob": 0.01,
        "human_review_prob": 0.05
    }
    verdict = PolicyEngine.evaluate_policy(features, jev)
    assert verdict["verdict"] == "ALLOW"
    assert verdict["human_review_required"] is False