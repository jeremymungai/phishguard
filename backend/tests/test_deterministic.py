from app.services.analysis.lookalike import check_lookalike_domain
from app.services.analysis.deterministic import parse_auth_results, analyze_deterministic_features

def test_lookalike_domain_detection():
    # micros0ft.com should be flagged as lookalike of microsoft.com
    is_lookalike, target = check_lookalike_domain("micros0ft.com")
    assert is_lookalike is True
    assert target == "microsoft.com"

    # login-microsoft.com should be flagged
    is_lookalike, target = check_lookalike_domain("login-microsoft.com")
    assert is_lookalike is True
    assert target == "microsoft.com"

    # Exact official domain should NOT be flagged
    is_lookalike, target = check_lookalike_domain("microsoft.com")
    assert is_lookalike is False

def test_auth_results_parsing():
    auth_header = "spf=pass (google.com: domain designates IP) dkim=pass dmarc=pass"
    res = parse_auth_results(auth_header, "")
    assert res["spf"] == "PASS"
    assert res["dkim"] == "PASS"
    assert res["dmarc"] == "PASS"

def test_deterministic_feature_pipeline():
    parsed = {
        "headers": {
            "from_display": "CEO Tim Cook",
            "from_email": "tim.cook@gmail.com",
            "from_domain": "gmail.com",
            "reply_to_email": "attacker@gmail.com",
            "subject": "Urgent gift cards needed right now",
            "authentication_results": "spf=pass dkim=pass dmarc=pass"
        },
        "plain_text": "Please purchase 5 apple gift cards immediately for client presentation.",
        "sanitized_html": "",
        "attachments": []
    }
    feats = analyze_deterministic_features(parsed)
    assert feats["signals"]["display_name_spoofing"] is True
    assert len(feats["signals"]["financial_keywords"]) > 0
    assert len(feats["signals"]["urgency_keywords"]) > 0
    assert feats["signals"]["deterministic_risk_score"] > 0.3