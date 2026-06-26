-- =============================================================================
-- Migration 001: Security fixes
-- =============================================================================
-- Run this against your existing Supabase instance via:
--   Supabase Dashboard → SQL Editor → New query → paste → Run
--
-- All statements are idempotent (safe to re-run).
-- Fresh deployments do not need this — schema.sql already includes
-- every change below.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Allow NULL trip_id in trip_chats
--    Root cause: general/dashboard chat (not scoped to a specific trip) inserts
--    with trip_id = NULL, but the column was declared NOT NULL.
--    Effect of omission: every general chat message silently failed to persist
--    and the 20-message daily rate limit was permanently stuck at 0.
-- ---------------------------------------------------------------------------
ALTER TABLE public.trip_chats ALTER COLUMN trip_id DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Partial index for general-chat rate-limit count queries
--    The rate-limit query filters WHERE trip_id IS NULL — a partial index
--    makes this O(log n) instead of a full table scan.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS trip_chats_general_idx
  ON public.trip_chats(user_id, created_at DESC)
  WHERE trip_id IS NULL;

-- ---------------------------------------------------------------------------
-- 3. RLS UPDATE policy for accepting collaboration invitations
--    Root cause: the accept-invite API route does a direct UPDATE on
--    trip_collaborators, but no UPDATE RLS policy existed. Without a policy,
--    RLS blocks the operation entirely, so invite acceptance always returned
--    an internal server error.
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'trip_collaborators'
      AND policyname = 'collabs_invite_accept'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "collabs_invite_accept" ON public.trip_collaborators
        FOR UPDATE
        USING  (invite_token IS NOT NULL AND accepted_at IS NULL)
        WITH CHECK (user_id = auth.uid() AND accepted_at IS NOT NULL)
    $p$;
  END IF;
END $$;
