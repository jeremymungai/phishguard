import email
from email import policy
from email.utils import parseaddr
import hashlib
from typing import Any
from app.services.email.sanitizer import sanitize_email_html, extract_visible_text

def parse_raw_eml(raw_content: str | bytes) -> dict[str, Any]:
    """
    Parses a raw RFC 5322 / MIME email string or bytes.
    Extracts headers, body representations (plain, sanitized HTML), and attachment metadata.
    Safely strips UTF-8 BOM if present from Windows file systems.
    """
    if isinstance(raw_content, bytes):
        raw_content = raw_content.removeprefix(b"\xef\xbb\xbf")
        msg = email.message_from_bytes(raw_content, policy=policy.default)
    else:
        raw_content = raw_content.lstrip("\ufeff")
        msg = email.message_from_string(raw_content, policy=policy.default)

    # 1. Parse headers
    raw_from = str(msg.get("From", ""))
    from_display, from_email = parseaddr(raw_from)
    from_domain = from_email.split("@")[-1].lower() if "@" in from_email else ""

    raw_to = str(msg.get("To", ""))
    _, to_email = parseaddr(raw_to)

    raw_reply_to = str(msg.get("Reply-To", ""))
    reply_display, reply_email = parseaddr(raw_reply_to) if raw_reply_to else ("", "")

    subject = str(msg.get("Subject", "(No Subject)"))
    date = str(msg.get("Date", ""))
    message_id = str(msg.get("Message-ID", ""))
    auth_results = str(msg.get("Authentication-Results", ""))
    received_spf = str(msg.get("Received-SPF", ""))

    received_headers = msg.get_all("Received", [])

    # 2. Extract bodies & attachments
    plain_text = ""
    raw_html = ""
    attachments = []

    if msg.is_multipart():
        for part in msg.walk():
            content_disposition = str(part.get("Content-Disposition", ""))
            content_type = part.get_content_type()
            
            is_attachment = "attachment" in content_disposition.lower() or (
                part.get_filename() is not None and "inline" not in content_disposition.lower()
            )

            if is_attachment:
                filename = part.get_filename() or "unnamed_attachment"
                payload = part.get_payload(decode=True) or b""
                size_bytes = len(payload)
                sha256_hash = hashlib.sha256(payload).hexdigest()

                attachments.append({
                    "filename": filename,
                    "mime_type": content_type,
                    "size_bytes": size_bytes,
                    "sha256_hash": sha256_hash,
                })
            else:
                if content_type == "text/plain" and not plain_text:
                    try:
                        plain_text = part.get_content()
                    except Exception:
                        payload = part.get_payload(decode=True)
                        plain_text = payload.decode("utf-8", errors="replace") if payload else ""
                elif content_type == "text/html" and not raw_html:
                    try:
                        raw_html = part.get_content()
                    except Exception:
                        payload = part.get_payload(decode=True)
                        raw_html = payload.decode("utf-8", errors="replace") if payload else ""
    else:
        content_type = msg.get_content_type()
        if content_type == "text/html":
            try:
                raw_html = msg.get_content()
            except Exception:
                payload = msg.get_payload(decode=True)
                raw_html = payload.decode("utf-8", errors="replace") if payload else ""
        else:
            try:
                plain_text = msg.get_content()
            except Exception:
                payload = msg.get_payload(decode=True)
                plain_text = payload.decode("utf-8", errors="replace") if payload else ""

    if not plain_text and raw_html:
        plain_text = extract_visible_text(raw_html)

    sanitized_html = sanitize_email_html(raw_html)

    return {
        "headers": {
            "from_raw": raw_from,
            "from_display": from_display,
            "from_email": from_email,
            "from_domain": from_domain,
            "to_raw": raw_to,
            "to_email": to_email,
            "reply_to_email": reply_email,
            "reply_to_display": reply_display,
            "subject": subject,
            "date": date,
            "message_id": message_id,
            "authentication_results": auth_results,
            "received_spf": received_spf,
            "received_count": len(received_headers),
        },
        "plain_text": plain_text.strip(),
        "sanitized_html": sanitized_html,
        "attachments": attachments,
    }