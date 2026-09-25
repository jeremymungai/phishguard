from app.services.email.parser import parse_raw_eml

def test_parse_legitimate_eml():
    eml = """From: Alice <alice@example.com>
To: Bob <bob@example.com>
Subject: Team Sync Tomorrow
Date: Fri, 25 Sep 2026 10:00:00 +0000
Message-ID: <msg-123@example.com>
Authentication-Results: spf=pass dkim=pass dmarc=pass
Content-Type: text/plain; charset=UTF-8

Hey Bob, let's catch up at 2pm."""

    res = parse_raw_eml(eml)
    assert res["headers"]["from_email"] == "alice@example.com"
    assert res["headers"]["from_domain"] == "example.com"
    assert res["headers"]["subject"] == "Team Sync Tomorrow"
    assert "Hey Bob" in res["plain_text"]
    assert res["headers"]["authentication_results"] != ""

def test_html_sanitization_neutralizes_links():
    eml = """From: Spoof <spoof@bad.com>
To: User <user@example.com>
Subject: Malicious Click
Content-Type: text/html; charset=UTF-8

<html><body><a href="http://dangerous-malware.com/payload.exe">Click Here</a><script>alert(1)</script></body></html>"""

    res = parse_raw_eml(eml)
    assert "<script>" not in res["sanitized_html"]
    assert "data-original-href=\"http://dangerous-malware.com/payload.exe\"" in res["sanitized_html"]
    assert "neutralized-phish-link" in res["sanitized_html"]