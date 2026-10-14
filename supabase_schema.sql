-- ============================================================================
-- WAYMARK SUPABASE SCHEMA
-- Isolated table names (waymark_*) to avoid collision with any other website
-- in the same Supabase project.
-- ============================================================================

-- 1. Goals / Marks Table
CREATE TABLE IF NOT EXISTS public.waymark_goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  why TEXT DEFAULT '',
  kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  target NUMERIC DEFAULT 0,
  current NUMERIC DEFAULT 0,
  unit TEXT DEFAULT '',
  deadline TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  milestones JSONB DEFAULT '[]'::jsonb,
  check_ins JSONB DEFAULT '[]'::jsonb,
  reminder JSONB,
  board_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Boards Table (Whiteboard strokes and stickies)
CREATE TABLE IF NOT EXISTS public.waymark_boards (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  goal_id TEXT,
  strokes JSONB DEFAULT '[]'::jsonb,
  stickies JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Profile Table
CREATE TABLE IF NOT EXISTS public.waymark_profile (
  id TEXT PRIMARY KEY DEFAULT 'default_user',
  name TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) with open public access policies for anon key
ALTER TABLE public.waymark_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waymark_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waymark_profile ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read/write access to waymark tables
DROP POLICY IF EXISTS "Allow anon all on waymark_goals" ON public.waymark_goals;
CREATE POLICY "Allow anon all on waymark_goals" ON public.waymark_goals
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on waymark_boards" ON public.waymark_boards;
CREATE POLICY "Allow anon all on waymark_boards" ON public.waymark_boards
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on waymark_profile" ON public.waymark_profile;
CREATE POLICY "Allow anon all on waymark_profile" ON public.waymark_profile
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Enable real-time for live cross-device sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.waymark_goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.waymark_boards;
