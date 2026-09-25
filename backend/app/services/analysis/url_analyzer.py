import re
from urllib.parse import urlparse, unquote
import tldextract
from bs4 import BeautifulSoup
from app.services.analysis.lookalike import check_lookalike_domain

SUSPICIOUS_TLDS = {
    "top", "xyz", "click", "buzz", "fit", "work", "rest", "tk", "ml", "ga",
    "cf", "gq", "country", "stream", "cam", "live", "link", "guru", "surf"
}

LOGIN_KEYWORDS = ["login", "signin", "auth", "verify", "password", "credential", "session", "update-account", "bank", "secure"]

URL_REGEX = re.compile(
    r'(?i)\b((?:https?://|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:\'\".,<>?«»“”‘’]))'
)

IPV4_REGEX = re.compile(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$')

def extract_and_analyze_urls(html_content: str, plain_text: str) -> list[dict]:
    """
    Extracts all URLs from HTML and plain text, normalizes them,
    and runs deterministic security feature extraction.
    NEVER visits or clicks external links.
    """
    raw_urls = set()

    # 1. Extract from HTML
    if html_content:
        soup = BeautifulSoup(html_content, "html.parser")
        for tag in soup.find_all(["a", "link", "form"]):
            href = tag.get("href") or tag.get("action")
            if href and (href.startswith("http://") or href.startswith("https://")):
                raw_urls.add(href.strip())

    # 2. Extract from plaintext
    if plain_text:
        matches = URL_REGEX.findall(plain_text)
        for match in matches:
            url_candidate = match[0]
            if not url_candidate.startswith("http://") and not url_candidate.startswith("https://"):
                url_candidate = "http://" + url_candidate
            raw_urls.add(url_candidate.strip())

    analyzed_urls = []
    for original_url in raw_urls:
        try:
            parsed = urlparse(original_url)
            scheme = parsed.scheme.lower()
            hostname = parsed.netloc.lower().split(":")[0]  # remove port if any
            path = unquote(parsed.path).lower()

            # Extract registrable domain (e.g. login.micros0ft.com -> micros0ft.com)
            ext = tldextract.extract(hostname)
            registrable_domain = f"{ext.domain}.{ext.suffix}".lower() if ext.suffix else hostname
            tld = ext.suffix.lower()

            is_https = (scheme == "https")
            is_ip = bool(IPV4_REGEX.match(hostname))
            is_suspicious_tld = tld in SUSPICIOUS_TLDS
            has_login_kw = any(kw in path for kw in LOGIN_KEYWORDS)

            is_lookalike, target_brand = check_lookalike_domain(registrable_domain)

            normalized_url = f"{scheme}://{hostname}{parsed.path}"

            analyzed_urls.append({
                "original_url": original_url,
                "normalized_url": normalized_url,
                "hostname": hostname,
                "registrable_domain": registrable_domain,
                "scheme": scheme,
                "is_https": is_https,
                "is_ip_address": is_ip,
                "is_lookalike": is_lookalike,
                "lookalike_target": target_brand,
                "has_login_keywords": has_login_kw,
                "suspicious_tld": is_suspicious_tld,
            })
        except Exception:
            continue

    return analyzed_urls