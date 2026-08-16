"""Pure Tunisian phone-number normalisation. No I/O — see
docs/ARCHITECTURE.md 5.9.4 and the services/ charter (4.15.8).
"""

import re

_DIGITS_OR_PLUS = re.compile(r"[^0-9+]")
_TN_8_DIGITS = re.compile(r"^[0-9]{8}$")


def normalise_tn_phone(raw: str) -> str | None:
    """'72 431 210', '+216 72-431-210', '0021672431210' -> '+21672431210'.
    Returns None when the input cannot be read as a Tunisian number.

    Rules, in order: strip every character that is not a digit or a
    leading `+`; map a leading `00` to `+`; accept `+216XXXXXXXX`,
    `216XXXXXXXX`, or a bare `XXXXXXXX` (8 digits) and emit
    `+21672431210`-style output; anything else is `None`.
    """
    if not raw:
        return None

    # Strip everything except digits and '+' (spaces, dashes, dots, ...).
    cleaned = _DIGITS_OR_PLUS.sub("", raw.strip())
    if not cleaned:
        return None

    # A leading '+' may only ever be the very first character; a stray '+'
    # anywhere else means the input was not a phone number.
    if cleaned.count("+") > 1 or ("+" in cleaned and not cleaned.startswith("+")):
        return None

    # Map a leading international-dial-out '00' to '+'.
    if cleaned.startswith("00"):
        cleaned = "+" + cleaned[2:]

    if cleaned.startswith("+216"):
        national = cleaned[4:]
    elif cleaned.startswith("216"):
        national = cleaned[3:]
    elif cleaned.startswith("+"):
        # A '+' prefix for a country other than +216 is not a Tunisian
        # number — do not strip it and try again.
        return None
    else:
        national = cleaned

    if not _TN_8_DIGITS.match(national):
        return None

    return f"+216{national}"
