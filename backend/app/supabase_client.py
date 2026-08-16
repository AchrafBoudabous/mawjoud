from functools import lru_cache

from supabase import Client, create_client

from app.config import settings


@lru_cache
def get_supabase() -> Client:
    """Module-level singleton Supabase client, built with the service role
    key. The backend never receives or uses the anon key.
    """
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
