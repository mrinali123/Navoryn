-- =============================================================================
-- Roamly — Complete Database Schema
-- Run this once in: Supabase Dashboard → SQL Editor → New query → Run
--
-- This is the single source of truth for the entire database.
-- Safe to run from scratch or against an existing database
-- (all statements use IF NOT EXISTS / CREATE OR REPLACE).
-- =============================================================================

-- =============================================================================
-- 1. TABLES
-- =============================================================================

-- ── profiles ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           TEXT        NOT NULL DEFAULT '',
  email               TEXT        NOT NULL DEFAULT '',
  home_city           TEXT        DEFAULT NULL,
  default_budget      TEXT        DEFAULT NULL,
  default_interests   TEXT[]      DEFAULT '{}',
  default_dietary     TEXT[]      DEFAULT '{}',
  preferred_currency  TEXT        DEFAULT 'USD',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── trips ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trips (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destination              TEXT        NOT NULL,
  trip_title               TEXT        NOT NULL,
  arrival_date             DATE        NOT NULL,
  departure_date           DATE        NOT NULL,
  hotel_name               TEXT        NOT NULL,
  hotel_address            TEXT        NOT NULL DEFAULT '',
  num_travelers            INTEGER     NOT NULL DEFAULT 1,
  trip_purpose             TEXT        NOT NULL DEFAULT 'tourism',
  budget_level             TEXT        NOT NULL DEFAULT 'mid-range',
  pace                     TEXT        NOT NULL DEFAULT 'balanced',
  interests                TEXT[]      NOT NULL DEFAULT '{}',
  dietary_prefs            TEXT[]      NOT NULL DEFAULT '{}',
  must_visit               TEXT        NOT NULL DEFAULT '',
  estimated_budget         TEXT        NOT NULL DEFAULT '',
  general_tips             TEXT[]      NOT NULL DEFAULT '{}',
  share_token              TEXT        UNIQUE DEFAULT NULL,
  is_public                BOOLEAN     NOT NULL DEFAULT FALSE,
  weather_cache            JSONB       DEFAULT NULL,
  weather_cache_updated_at TIMESTAMPTZ DEFAULT NULL,
  preferred_currency       TEXT        DEFAULT 'USD',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trips_user_id_idx     ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS trips_created_at_idx  ON public.trips(created_at DESC);
CREATE INDEX IF NOT EXISTS trips_share_token_idx ON public.trips(share_token) WHERE share_token IS NOT NULL;

-- ── itinerary_days ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.itinerary_days (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     UUID        NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  day_number  INTEGER     NOT NULL,
  date        DATE        NOT NULL,
  theme       TEXT        NOT NULL DEFAULT '',
  daily_notes TEXT        NOT NULL DEFAULT '',
  places      JSONB       NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS itinerary_days_trip_id_idx ON public.itinerary_days(trip_id);
CREATE INDEX IF NOT EXISTS itinerary_days_order_idx   ON public.itinerary_days(trip_id, day_number);

-- ── trip_chats ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trip_chats (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id    UUID        NOT NULL REFERENCES public.trips(id)  ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trip_chats_trip_user_idx
  ON public.trip_chats(trip_id, user_id, created_at DESC);

-- ── trip_expenses ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trip_expenses (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      UUID           NOT NULL REFERENCES public.trips(id)  ON DELETE CASCADE,
  user_id      UUID           NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  name         TEXT           NOT NULL,
  amount       DECIMAL(12, 2) NOT NULL,
  currency     TEXT           NOT NULL DEFAULT 'USD',
  category     TEXT           NOT NULL,
  expense_date DATE           NOT NULL DEFAULT CURRENT_DATE,
  notes        TEXT,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trip_expenses_trip_idx
  ON public.trip_expenses(trip_id, expense_date);

-- ── trip_collaborators ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trip_collaborators (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id       UUID        NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor')),
  invite_token  TEXT        UNIQUE NOT NULL,
  accepted_at   TIMESTAMPTZ,
  invited_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trip_collaborators_trip_idx  ON public.trip_collaborators(trip_id);
CREATE INDEX IF NOT EXISTS trip_collaborators_token_idx ON public.trip_collaborators(invite_token);
CREATE INDEX IF NOT EXISTS trip_collaborators_user_idx  ON public.trip_collaborators(user_id);

-- =============================================================================
-- 2. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_days      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_chats          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_expenses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_collaborators  ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 3. SECURITY DEFINER HELPERS
-- Run as the function owner (bypassing RLS) to prevent circular policy
-- references between trips and trip_collaborators.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rls_is_trip_owner(p_trip_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trips WHERE id = p_trip_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.rls_is_trip_collaborator(p_trip_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_collaborators
    WHERE trip_id = p_trip_id AND user_id = auth.uid() AND accepted_at IS NOT NULL
  );
$$;

-- =============================================================================
-- 4. RLS POLICIES
-- =============================================================================

-- ── profiles ──────────────────────────────────────────────────────────────────
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ── trips ─────────────────────────────────────────────────────────────────────
-- Trip owner: full CRUD
CREATE POLICY "trips_owner_all" ON public.trips
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Accepted collaborators: read-only (SECURITY DEFINER breaks the RLS cycle)
CREATE POLICY "trips_collaborator_select" ON public.trips
  FOR SELECT USING (public.rls_is_trip_collaborator(id));

-- Public share links: anyone can read without authentication
CREATE POLICY "trips_public_select" ON public.trips
  FOR SELECT USING (is_public = TRUE AND share_token IS NOT NULL);

-- ── itinerary_days ────────────────────────────────────────────────────────────
-- Trip owner: full CRUD via SECURITY DEFINER (avoids RLS loop through trips)
CREATE POLICY "days_owner_all" ON public.itinerary_days
  FOR ALL
  USING (public.rls_is_trip_owner(trip_id))
  WITH CHECK (public.rls_is_trip_owner(trip_id));

-- Accepted collaborators: read-only
CREATE POLICY "days_collaborator_select" ON public.itinerary_days
  FOR SELECT USING (public.rls_is_trip_collaborator(trip_id));

-- Public share: anyone can read days of a publicly shared trip
CREATE POLICY "days_public_select" ON public.itinerary_days
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND is_public = TRUE)
  );

-- ── trip_chats ────────────────────────────────────────────────────────────────
CREATE POLICY "chats_select_own" ON public.trip_chats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "chats_insert_own" ON public.trip_chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chats_delete_own" ON public.trip_chats
  FOR DELETE USING (auth.uid() = user_id);

-- ── trip_expenses ─────────────────────────────────────────────────────────────
CREATE POLICY "expenses_select" ON public.trip_expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "expenses_insert" ON public.trip_expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expenses_update" ON public.trip_expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "expenses_delete" ON public.trip_expenses
  FOR DELETE USING (auth.uid() = user_id);

-- ── trip_collaborators ────────────────────────────────────────────────────────
-- Owner can see all collaborators; collaborator can see their own row
CREATE POLICY "collabs_select" ON public.trip_collaborators
  FOR SELECT USING (public.rls_is_trip_owner(trip_id) OR user_id = auth.uid());

-- Only the trip owner can invite collaborators
CREATE POLICY "collabs_insert_owner" ON public.trip_collaborators
  FOR INSERT WITH CHECK (public.rls_is_trip_owner(trip_id));

-- Only the trip owner can remove collaborators
CREATE POLICY "collabs_delete_owner" ON public.trip_collaborators
  FOR DELETE USING (public.rls_is_trip_owner(trip_id));

-- =============================================================================
-- 5. FUNCTIONS AND TRIGGERS
-- =============================================================================

-- ── Auto-create profile row on signup ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── Read invite by token (works without authentication) ───────────────────────
-- The invite token is itself the secret; no additional auth guard needed.
CREATE OR REPLACE FUNCTION public.get_invite_by_token(p_token text)
RETURNS TABLE (
  id            uuid,
  trip_id       uuid,
  invited_email text,
  role          text,
  accepted_at   timestamptz
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT id, trip_id, invited_email, role, accepted_at
  FROM public.trip_collaborators
  WHERE invite_token = p_token
  LIMIT 1;
$$;

-- ── Accept an invitation — links the caller's account to the trip ──────────────
CREATE OR REPLACE FUNCTION public.accept_invite(p_token text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.trip_collaborators;
BEGIN
  SELECT * INTO v_row
  FROM public.trip_collaborators
  WHERE invite_token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invalid invite token');
  END IF;

  IF v_row.accepted_at IS NOT NULL THEN
    RETURN json_build_object('trip_id', v_row.trip_id);
  END IF;

  UPDATE public.trip_collaborators
  SET user_id = auth.uid(), accepted_at = NOW()
  WHERE id = v_row.id;

  RETURN json_build_object('trip_id', v_row.trip_id);
END;
$$;

-- ── Delete the caller's own account (cascades to all their data via FK) ────────
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  DELETE FROM auth.users WHERE id = _uid;
END;
$$;

REVOKE ALL  ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
