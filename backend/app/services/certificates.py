"""Pharmacy certificate uploads: pure validation, no I/O.

The type is decided from the file's own first bytes (magic numbers), never
from the browser-supplied filename or Content-Type, both of which an
uploader controls.
"""

CERTIFICATE_BUCKET = "pharmacy-certificates"
MAX_CERTIFICATE_BYTES = 5 * 1024 * 1024  # mirrors the bucket's file_size_limit
# Multipart overhead + form fields on top of the file itself.
MAX_REGISTRATION_BODY_BYTES = MAX_CERTIFICATE_BYTES + 256 * 1024

_EXTENSIONS = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


def sniff_certificate_type(head: bytes) -> str | None:
    """Return the MIME type for an accepted certificate format, else None."""
    if head.startswith(b"%PDF-"):
        return "application/pdf"
    if head.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if len(head) >= 12 and head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp"
    return None


def certificate_extension(content_type: str) -> str:
    return _EXTENSIONS[content_type]
