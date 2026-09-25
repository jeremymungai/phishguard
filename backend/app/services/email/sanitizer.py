import re
import bleach
from bs4 import BeautifulSoup

ALLOWED_TAGS = [
    "a", "abbr", "acronym", "b", "blockquote", "code", "em", "i", "li", "ol",
    "strong", "ul", "p", "br", "div", "span", "table", "tbody", "thead",
    "tr", "th", "td", "h1", "h2", "h3", "h4", "h5", "h6", "hr"
]

ALLOWED_ATTRIBUTES = {
    "a": ["data-original-href", "title", "class", "target", "rel", "href"],
    "*": ["class"]
}

def sanitize_email_html(raw_html: str) -> str:
    """
    Safely sanitizes untrusted email HTML for display in the SOC dashboard.
    - Strips all scripts, iframes, tracking pixels, and active content.
    - Rewrites <a> tags to neutralize live clicks, storing the destination in data-original-href.
    """
    if not raw_html:
        return ""

    soup = BeautifulSoup(raw_html, "html.parser")
    
    # Strip dangerous tags entirely
    for dangerous in soup(["script", "iframe", "object", "embed", "applet", "meta", "base", "form"]):
        dangerous.decompose()

    for a_tag in soup.find_all("a"):
        original_href = a_tag.get("href", "")
        a_tag["data-original-href"] = original_href
        a_tag["href"] = "javascript:void(0)"
        a_tag["target"] = "_self"
        a_tag["rel"] = "noopener noreferrer"
        a_tag["title"] = f"Neutralized link: {original_href}"
        existing_class = a_tag.get("class", [])
        if isinstance(existing_class, str):
            existing_class = [existing_class]
        a_tag["class"] = existing_class + ["neutralized-phish-link"]

    clean_soup_html = str(soup)

    # Filter with bleach
    sanitized = bleach.clean(
        clean_soup_html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        strip=True
    )
    return sanitized

def extract_visible_text(html_content: str) -> str:
    """Extracts normalized plaintext from HTML."""
    if not html_content:
        return ""
    soup = BeautifulSoup(html_content, "html.parser")
    for s in soup(["script", "style", "head", "title", "meta"]):
        s.extract()
    text = soup.get_text(separator=" ")
    return re.sub(r"\s+", " ", text).strip()