"""Test settings. Must run before any `app.*` import: app.config builds
Settings() at import time and refuses to boot without these."""

import os

os.environ.setdefault("SUPABASE_URL", "https://example-project.supabase.co/")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key-at-least-twenty-chars")
os.environ.setdefault("REPORT_FINGERPRINT_SECRET", "x" * 48)
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost:3000")
os.environ.setdefault("ALLOWED_ORIGIN_REGEX", "")
