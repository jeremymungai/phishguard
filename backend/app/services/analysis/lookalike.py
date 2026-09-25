import re
from typing import Optional

HIGH_VALUE_DOMAINS = [
    "microsoft.com", "office.com", "live.com", "outlook.com",
    "google.com", "gmail.com", "apple.com", "icloud.com",
    "amazon.com", "paypal.com", "chase.com", "wellsfargo.com",
    "bankofamerica.com", "docusign.net", "docusign.com",
    "dropbox.com", "slack.com", "github.com", "zoom.us", "okta.com"
]

HOMOGLYPH_MAP = {
    "0": "o", "1": "l", "!": "i", "@": "a",
    "vv": "w", "rn": "m", "cl": "d"
}

def normalize_domain_characters(domain: str) -> str:
    """Replaces common leetspeak/homoglyph characters with Latin base characters."""
    normalized = domain.lower()
    for char, rep in HOMOGLYPH_MAP.items():
        normalized = normalized.replace(char, rep)
    return normalized

def levenshtein_distance(s1: str, s2: str) -> int:
    """Calculates standard Levenshtein distance between two strings."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    previous_row = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]

def check_lookalike_domain(candidate_domain: str) -> tuple[bool, Optional[str]]:
    """
    Checks if a candidate domain is a lookalike/typosquatted version of a high-value domain.
    Returns: (is_lookalike: bool, targeted_brand_domain: str | None)
    """
    if not candidate_domain:
        return False, None

    cand = candidate_domain.lower().strip()

    # Exact match is legitimate, not a lookalike
    if cand in HIGH_VALUE_DOMAINS:
        return False, None

    # Punycode / IDN detection
    if cand.startswith("xn--") or ".xn--" in cand:
        return True, "punycode_idn_spoof"

    cand_normalized = normalize_domain_characters(cand)

    for target in HIGH_VALUE_DOMAINS:
        target_name = target.split(".")[0]
        cand_name = cand.split(".")[0]
        norm_cand_name = cand_normalized.split(".")[0]

        # 1. Hyphenated / Keyword brand squatting (checks raw or homoglyph-normalized, e.g. login-micros0ft)
        if (target_name in cand or target_name in cand_normalized) and cand != target:
            return True, target

        # 2. Levenshtein distance on raw label (e.g. micros0ft vs microsoft)
        dist = levenshtein_distance(cand_name, target_name)
        if 0 < dist <= 2 and abs(len(cand_name) - len(target_name)) <= 2:
            return True, target

        # 3. Levenshtein on homoglyph-normalized label
        norm_dist = levenshtein_distance(norm_cand_name, target_name)
        if (norm_dist == 0 or (0 < norm_dist <= 2 and abs(len(norm_cand_name) - len(target_name)) <= 2)) and cand != target:
            return True, target

    return False, None