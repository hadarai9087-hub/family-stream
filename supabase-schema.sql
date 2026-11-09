-- Family Stream: Production Database Schema for Supabase
-- Optimized for Free Tier (500MB Postgres, 200 Concurrent Realtime connections, 10+ active family users)

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL,
  is_kids BOOLEAN DEFAULT FALSE,
  pin TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Watch Progress Table ("Continue Watching" / "הבא בתור")
-- 1 row per profile & media_id stores the latest watched progress (eliminates duplicate cards and minimizes storage)
CREATE TABLE IF NOT EXISTS public.watch_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_id BIGINT NOT NULL,
  media_type TEXT NOT NULL, -- 'movie' or 'tv'
  title TEXT NOT NULL,
  poster_path TEXT,
  backdrop_path TEXT,
  season_number INT DEFAULT 0 NOT NULL,
  episode_number INT DEFAULT 0 NOT NULL,
  episode_name TEXT,
  progress_seconds INT DEFAULT 0 NOT NULL,
  duration_seconds INT DEFAULT 0 NOT NULL,
  percentage INT DEFAULT 0 NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(profile_id, media_id)
);

-- 3. My List Table (Favorites)
CREATE TABLE IF NOT EXISTS public.my_list (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_id BIGINT NOT NULL,
  media_type TEXT NOT NULL,
  title TEXT NOT NULL,
  poster_path TEXT,
  vote_average NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(profile_id, media_id)
);

-- 4. Smart TV Pairing Table (With account_data payload for 1-tap phone sync)
CREATE TABLE IF NOT EXISTS public.tv_pairings (
  code TEXT PRIMARY KEY,
  profile_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' NOT NULL, -- 'pending' | 'approved'
  account_data TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. High-Performance Indexes for 10+ Concurrent Family Users (Prevents DB CPU spikes & slow table scans)
CREATE INDEX IF NOT EXISTS idx_watch_progress_profile ON public.watch_progress(profile_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_my_list_profile ON public.my_list(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tv_pairings_code ON public.tv_pairings(code);
CREATE INDEX IF NOT EXISTS idx_tv_pairings_status_exp ON public.tv_pairings(status, expires_at);

-- 6. Enable Row Level Security (RLS) and Permissive Policies for Family Cloud
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.my_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tv_pairings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow family read/write profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow family read/write watch_progress" ON public.watch_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow family read/write my_list" ON public.my_list FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow family read/write tv_pairings" ON public.tv_pairings FOR ALL USING (true) WITH CHECK (true);
