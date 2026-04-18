-- ═══════════════════════════════════════════════════════════════════════════
-- Profile · Custom status text/emoji + DND window
-- Users set a free-form status ("In a meeting", optional expiry) and an
-- optional DND-until timestamp that clients use to silence notifications.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status_text        text,
  ADD COLUMN IF NOT EXISTS status_emoji       text,
  ADD COLUMN IF NOT EXISTS status_expires_at  timestamptz,
  ADD COLUMN IF NOT EXISTS dnd_until          timestamptz;

-- Helpful index for "is user currently DND?" checks
CREATE INDEX IF NOT EXISTS idx_profiles_dnd_until ON public.profiles(dnd_until)
  WHERE dnd_until IS NOT NULL;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
