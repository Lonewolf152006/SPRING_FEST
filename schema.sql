-- AMEP (Adaptive Mastery & Engagement Platform) Database Schema
-- Run this in the Supabase SQL Editor

-- 1. PROFILES: Links to Supabase Auth
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'Student',
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CLASSES: Management of institutional segments
CREATE TABLE IF NOT EXISTS public.amep_classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. USER STATS: XP and Leveling system
CREATE TABLE IF NOT EXISTS public.amep_user_stats (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ASSIGNMENTS: Linking Teachers to Students for Roster Isolation
CREATE TABLE IF NOT EXISTS public.amep_assignments (
  id BIGSERIAL PRIMARY KEY,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, student_id)
);

-- 5. TASKS: Smart Planner and Kanban data
CREATE TABLE IF NOT EXISTS public.amep_tasks (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'medium',
  deadline TEXT,
  source TEXT DEFAULT 'personal',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MASTERY: Skill Tree and Subject progress
CREATE TABLE IF NOT EXISTS public.amep_mastery (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, subject_id)
);

-- 7. PROCTORING LOGS: Biometric snapshots and Confusion data
CREATE TABLE IF NOT EXISTS public.amep_proctoring_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  report_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. POLLS: Live classroom interaction
CREATE TABLE IF NOT EXISTS public.amep_polls (
  id TEXT PRIMARY KEY,
  teacher_id TEXT, -- Usually matches profile ID
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. EVENT PLANS: Event Hub storage
CREATE TABLE IF NOT EXISTS public.amep_event_plans (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  prompt TEXT,
  checklist JSONB,
  email_draft TEXT,
  budget_estimate TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. WELLNESS: Mental health journal entries
CREATE TABLE IF NOT EXISTS public.amep_wellness_entries (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  transcription TEXT,
  sentiment TEXT,
  score INTEGER,
  advice TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- AUTH TRIGGER: Sync metadata to Profiles
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, email)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name', 
    COALESCE(NEW.raw_user_meta_data->>'role', 'Student'),
    NEW.email
  );
  
  -- Initialize stats for the new user
  INSERT INTO public.amep_user_stats (user_id, xp, level)
  VALUES (NEW.id, 0, 1);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- PERMISSIONS: Disable strict RLS for Dev
-- ==========================================
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.amep_classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.amep_user_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.amep_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.amep_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.amep_mastery DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.amep_proctoring_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.amep_polls DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.amep_event_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.amep_wellness_entries DISABLE ROW LEVEL SECURITY;