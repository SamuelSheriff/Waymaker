-- ============================================================================
-- WAYMAKER SUPABASE SCHEMA
-- Scoped with client_id to prevent data collisions and ensure privacy across clients
-- ============================================================================

-- 1. Goals / Marks Table
CREATE TABLE IF NOT EXISTS public.waymark_goals (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL DEFAULT 'default_client',
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
  category TEXT,
  priority TEXT,
  obstacle TEXT,
  protocol TEXT,
  frequency_per_week NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on client_id for ultra-fast scoped queries
CREATE INDEX IF NOT EXISTS idx_waymark_goals_client ON public.waymark_goals(client_id);

-- 2. Boards Table (Whiteboard strokes, shapes, and stickies)
CREATE TABLE IF NOT EXISTS public.waymark_boards (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL DEFAULT 'default_client',
  title TEXT NOT NULL,
  goal_id TEXT,
  strokes JSONB DEFAULT '[]'::jsonb,
  stickies JSONB DEFAULT '[]'::jsonb,
  connections JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waymark_boards_client ON public.waymark_boards(client_id);

-- 3. Profile Table
CREATE TABLE IF NOT EXISTS public.waymark_profile (
  id TEXT PRIMARY KEY DEFAULT 'default_client',
  client_id TEXT NOT NULL DEFAULT 'default_client',
  name TEXT DEFAULT '',
  ai_api_key TEXT,
  ai_provider TEXT,
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
