import re
from typing import Any
from app.services.analysis.url_analyzer import extract_and_analyze_urls
from app.services.analysis.lookalike import check_lookalike_domain

DANGEROUS_EXTENSIONS = {
    ".exe", ".scr", ".bat", ".cmd", ".vbs", ".js", ".hta", ".iso",
    ".docm", ".xlsm", ".pptm", ".jar", ".ps1", ".lnk", ".cpl", ".dll"
}

URGENCY_PATTERNS = [
    r"\bimmediate(?:ly)?\s+action\b",
    r"\bwithin\s+24\s+hours\b",
    r"\baccount\s+(?:will\s+be\s+)?suspended\b",
    r"\bverify\s+your\s+(?:account|identity|email)\b",
    r"\bsecurity\s+alert\b",
    r"\bunauthorized\s+access\b",
    r"\bfailure\s+to\s+respond\b",
    r"\burgen(?:t|cy)\b",
    r"\bact\s+now\b",
    r"\bpromptly\b"
]

FINANCIAL_PATTERNS = [
    r"\bwire\s+transfer\b",
    r"\bgift\s+card(?:s)?\b",
    r"\bswift\s+(?:code|transfer)\b",
    r"\brouting\s+number\b",
    r"\bdirect\s+deposit\b",
    r"\binvoice\s+(?:attached|due|overdue|payment)\b",
    r"\bpurchase\s+order\b",
    r"\bbank\s+details\b",
    r"\bfinancial\s+update\b"
]

CREDENTIAL_PATTERNS = [
    r"\benter\s+your\s+(?:password|pin|credentials)\b",
    r"\breset\s+(?:your\s+)?password\b",
    r"\bconfirm\s+(?:your\s+)?(?:credentials|password|login)\b",
    r"\bmfa\s+(?:code|verification)\b",
    r"\b2fa\s+(?:code|verification)\b",
    r"\blogin\s+to\s+(?:verify|continue|access)\b",
    r"\bsign\s+in\s+to\s+your\s+account\b",
    r"\bupdate\s+(?:your\s+)?billing\s+details\b"
]

EXECUTIVE_TITLES = [
    "ceo", "chief executive officer", "cfo", "chief financial officer",
    "cto", "president", "director", "vice president", "treasurer"
]

def parse_auth_results(auth_header: str, spf_header: str) -> dict[str, str]:
    combined = f"{auth_header} {spf_header}".lower()
    spf = "NONE"
    if "spf=pass" in combined:
        spf = "PASS"
    elif "spf=fail" in combined:
        spf = "FAIL"
    elif "spf=softfail" in combined:
        spf = "SOFTFAIL"
    elif "spf=neutral" in combined:
        spf = "NEUTRAL"

    dkim = "NONE"
    if "dkim=pass" in combined:
        dkim = "PASS"
    elif "dkim=fail" in combined:
        dkim = "FAIL"

    dmarc = "NONE"
    if "dmarc=pass" in combined:
        dmarc = "PASS"
    elif "dmarc=fail" in combined:
        dmarc = "FAIL"

    return {"spf": spf, "dkim": dkim, "dmarc": dmarc}

def analyze_deterministic_features(parsed_email: dict[str, Any]) -> dict[str, Any]:
    headers = parsed_email["headers"]
    plain_text = parsed_email["plain_text"]
    sanitized_html = parsed_email["sanitized_html"]
    attachments = parsed_email["attachments"]

    from_domain = headers.get("from_domain", "")
    from_display = headers.get("from_display", "")
    from_email = headers.get("from_email", "")
    from_raw = headers.get("from_raw", "")
    reply_to_email = headers.get("reply_to_email", "")

    auth_results = parse_auth_results(
        headers.get("authentication_results", ""),
        headers.get("received_spf", "")
    )

    reply_to_mismatch = False
    if reply_to_email and from_email:
        reply_domain = reply_to_email.split("@")[-1].lower() if "@" in reply_to_email else ""
        if reply_domain and from_domain and reply_domain != from_domain:
            reply_to_mismatch = True

    is_sender_lookalike, lookalike_target = check_lookalike_domain(from_domain)
    lookalikes_found = []
    if is_sender_lookalike and lookalike_target:
        lookalikes_found.append(f"Sender domain {from_domain} impersonating {lookalike_target}")

    combined_body = f"{headers.get('subject', '')} {plain_text}".lower()

    display_name_spoof = False
    lower_display = (from_raw + " " + from_display).lower()
    for title in EXECUTIVE_TITLES:
        if title in lower_display or (title in combined_body and any(webmail in from_domain for webmail in ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"])):
            display_name_spoof = True
            break

    for brand in ["microsoft", "google", "apple", "paypal", "it support", "helpdesk"]:
        if brand in lower_display and brand not in from_domain:
            display_name_spoof = True
            break

    urls = extract_and_analyze_urls(sanitized_html, plain_text)
    suspicious_url_count = 0
    suspicious_tld_detected = False

    for u in urls:
        if u["is_lookalike"]:
            lookalikes_found.append(f"URL domain {u['registrable_domain']} impersonating {u['lookalike_target']}")
            suspicious_url_count += 1
        elif u["is_ip_address"] or (u["has_login_keywords"] and not u["is_https"]) or u["suspicious_tld"]:
            suspicious_url_count += 1

        if u["suspicious_tld"]:
            suspicious_tld_detected = True

    dangerous_attachments_count = 0
    for att in attachments:
        fname = att["filename"].lower()
        if any(fname.endswith(ext) for ext in DANGEROUS_EXTENSIONS):
            att["is_dangerous_type"] = True
            dangerous_attachments_count += 1
        else:
            att["is_dangerous_type"] = False

    urgency_hits = [p for p in URGENCY_PATTERNS if re.search(p, combined_body)]
    financial_hits = [p for p in FINANCIAL_PATTERNS if re.search(p, combined_body)]
    credential_hits = [p for p in CREDENTIAL_PATTERNS if re.search(p, combined_body)]

    risk = 0.0
    if auth_results["dmarc"] == "FAIL":
        risk += 0.25
    elif auth_results["spf"] == "FAIL":
        risk += 0.15

    if is_sender_lookalike:
        risk += 0.35
    if display_name_spoof:
        risk += 0.25
    if reply_to_mismatch:
        risk += 0.15

    if suspicious_url_count > 0:
        risk += min(0.35, 0.20 * suspicious_url_count)
    if dangerous_attachments_count > 0:
        risk += min(0.40, 0.30 * dangerous_attachments_count)

    if credential_hits:
        risk += 0.15
    if financial_hits:
        risk += 0.15
    if urgency_hits:
        risk += 0.10

    deterministic_risk = min(1.0, round(risk, 2))

    signals = {
        "spf_result": auth_results["spf"],
        "dkim_result": auth_results["dkim"],
        "dmarc_result": auth_results["dmarc"],
        "reply_to_mismatch": reply_to_mismatch,
        "display_name_spoofing": display_name_spoof,
        "suspicious_tld_detected": suspicious_tld_detected,
        "lookalike_domains": lookalikes_found,
        "urgency_keywords": urgency_hits,
        "financial_keywords": financial_hits,
        "credential_keywords": credential_hits,
        "suspicious_url_count": suspicious_url_count,
        "dangerous_attachment_count": dangerous_attachments_count,
        "deterministic_risk_score": deterministic_risk,
    }

    return {
        "sender": {
            "from_display": from_display,
            "from_email": from_email,
            "from_domain": from_domain,
            "reply_to_email": reply_to_email,
        },
        "recipient": headers.get("to_email", ""),
        "subject": headers.get("subject", ""),
        "date": headers.get("date", ""),
        "message_id": headers.get("message_id", ""),
        "authentication": auth_results,
        "urls": urls,
        "attachments": attachments,
        "signals": signals,
        "body_preview": plain_text[:300] if plain_text else "",
    }