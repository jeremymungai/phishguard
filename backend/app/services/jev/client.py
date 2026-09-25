import time
from typing import Any
from typesafe_sdk import TypeSafeClient, SystemOneResponse, ChoiceAnswer, NoulAnswer, ScoreAnswer, Usage
from typesafe_sdk import TypeSafeAuthenticationError
from app.config import TYPESAFE_API_KEY, is_api_key_configured
from app.services.jev.questions import build_phishguard_questions, CLASSIFICATION_CRITERIA, RISK_RUBRIC

class MockPhishGuardJevClient:
    """
    Offline simulator for TypeSafe AI Jev System-1 model.
    Produces strictly calibrated, non-hallucinated responses from the extracted security state.
    """

    def __init__(self, model_name: str = "jev-phishguard-mock"):
        self.model_name = model_name

    def system_one(self, state: dict[str, Any], questions: dict[str, Any], **kwargs: Any) -> SystemOneResponse:
        # Realistic micro-decision latency (30-60ms)
        time.sleep(0.045)

        signals = state.get("signals", {})
        det_risk = signals.get("deterministic_risk_score", 0.0)
        has_lookalike = len(signals.get("lookalike_domains", [])) > 0
        has_credentials = len(signals.get("credential_keywords", [])) > 0
        has_financial = len(signals.get("financial_keywords", [])) > 0
        is_display_spoof = signals.get("display_name_spoofing", False)
        suspicious_urls = signals.get("suspicious_url_count", 0) > 0
        has_dangerous_att = signals.get("dangerous_attachment_count", 0) > 0
        auth_dmarc = signals.get("dmarc_result", "NONE")

        # 1. Classification
        probs = {
            "legitimate": 0.02,
            "spam": 0.02,
            "phishing": 0.02,
            "business_email_compromise": 0.02,
            "malware": 0.02
        }

        if has_dangerous_att:
            selected_class = "malware"
            probs["malware"] = 0.88
            probs["phishing"] = 0.06
        elif is_display_spoof and has_financial:
            selected_class = "business_email_compromise"
            probs["business_email_compromise"] = 0.89
            probs["phishing"] = 0.05
        elif (has_credentials or has_lookalike or suspicious_urls) and det_risk >= 0.3:
            selected_class = "phishing"
            probs["phishing"] = 0.91
            probs["spam"] = 0.04
        elif det_risk <= 0.15 and auth_dmarc != "FAIL":
            selected_class = "legitimate"
            probs["legitimate"] = 0.92
            probs["spam"] = 0.04
        else:
            selected_class = "spam"
            probs["spam"] = 0.82
            probs["phishing"] = 0.10

        # 2. Credential theft probability
        if has_credentials and (has_lookalike or suspicious_urls):
            cred_prob = 0.96
        elif has_credentials:
            cred_prob = 0.78
        elif selected_class == "phishing":
            cred_prob = 0.65
        else:
            cred_prob = 0.04

        # 3. Malicious URL probability
        if has_lookalike or suspicious_urls:
            url_prob = 0.94
        elif selected_class in ("phishing", "malware"):
            url_prob = 0.62
        else:
            url_prob = 0.05

        # 4. BEC probability
        if selected_class == "business_email_compromise":
            bec_prob = 0.93
        elif is_display_spoof or has_financial:
            bec_prob = 0.68
        else:
            bec_prob = 0.03

        # 5. Risk Score (1.0 to 5.0)
        if selected_class in ("malware", "phishing") and (has_dangerous_att or has_lookalike):
            score_val = 4.8
        elif selected_class in ("phishing", "business_email_compromise"):
            score_val = 4.2
        elif selected_class == "spam":
            score_val = 2.4
        elif det_risk > 0.2:
            score_val = 2.8
        else:
            score_val = 1.2

        # 6. Human Review probability
        if score_val >= 4.0 or selected_class == "business_email_compromise":
            review_prob = 0.92
        elif score_val >= 2.5:
            review_prob = 0.45
        else:
            review_prob = 0.08

        # Build SystemOneResponse answers
        legend_dict = {i + 1: desc for i, desc in enumerate(RISK_RUBRIC)}
        probs_dict = {i + 1: 0.2 for i in range(5)}

        answers = {
            "classification": ChoiceAnswer(
                choice=selected_class,
                confidence=probs[selected_class],
                probabilities=probs
            ),
            "credential_theft": NoulAnswer(noul=cred_prob),
            "malicious_url": NoulAnswer(noul=url_prob),
            "bec": NoulAnswer(noul=bec_prob),
            "risk": ScoreAnswer(
                score=score_val,
                confidence=0.91,
                legend=legend_dict,
                probabilities=probs_dict
            ),
            "human_review": NoulAnswer(noul=review_prob)
        }

        return SystemOneResponse(
            model=self.model_name,
            usage=Usage(input_tokens=150, output_tokens=0),
            answers=answers
        )

def evaluate_with_jev(state: dict[str, Any]) -> dict[str, Any]:
    """
    Evaluates extracted email security state with TypeSafe Jev.
    Automatically uses live API if configured, or falls back to simulation mode.
    """
    start_time = time.perf_counter()
    questions = build_phishguard_questions()
    
    is_live = False
    client = None

    if is_api_key_configured():
        try:
            client = TypeSafeClient(api_key=TYPESAFE_API_KEY)
            response = client.system_one(state=state, questions=questions)
            is_live = True
        except TypeSafeAuthenticationError as e:
            # Fall back to simulation if credentials fail
            client = MockPhishGuardJevClient()
            response = client.system_one(state=state, questions=questions)
    else:
        client = MockPhishGuardJevClient()
        response = client.system_one(state=state, questions=questions)

    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

    class_ans = response.answers["classification"]
    cred_ans = response.answers["credential_theft"]
    url_ans = response.answers["malicious_url"]
    bec_ans = response.answers["bec"]
    risk_ans = response.answers["risk"]
    review_ans = response.answers["human_review"]

    return {
        "classification": class_ans.choice,
        "classification_confidence": round(getattr(class_ans, "confidence", 1.0), 3),
        "classification_probabilities": getattr(class_ans, "probabilities", {}),
        "credential_theft_prob": round(cred_ans.noul, 3),
        "bec_prob": round(bec_ans.noul, 3),
        "malicious_url_prob": round(url_ans.noul, 3),
        "risk_score": round(getattr(risk_ans, "score", 1.0), 2),
        "human_review_prob": round(review_ans.noul, 3),
        "latency_ms": latency_ms,
        "model": response.model,
        "is_live_api": is_live,
    }