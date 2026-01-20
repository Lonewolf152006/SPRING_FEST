-- ZYNC AMEP: Institutional OS Schema
-- EXECUTION: Run this in the Supabase SQL Editor (Full Overwrite)

-- 0. Cleanup (Optional, but makes redeployment "Fast")
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 1. Identity Infrastructure
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'Student',
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Institutional Segments
CREATE TABLE IF NOT EXISTS public.amep_classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Gamification Engine (XP/Prestige)
CREATE TABLE IF NOT EXISTS public.amep_user_stats (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Roster Isolation Logic (Teacher-Student Link)
CREATE TABLE IF NOT EXISTS public.amep_assignments (
  id BIGSERIAL PRIMARY KEY,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, student_id)
);

-- 5. Productivity & Scheduling
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

-- 6. Academic Mastery Tracking
CREATE TABLE IF NOT EXISTS public.amep_mastery (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, subject_id)
);

-- 7. Neural Proctoring & Biometric Evidence
CREATE TABLE IF NOT EXISTS public.amep_proctoring_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  report_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Classroom Interaction Hub
CREATE TABLE IF NOT EXISTS public.amep_polls (
  id TEXT PRIMARY KEY,
  teacher_id TEXT,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Extracurricular Planner
CREATE TABLE IF NOT EXISTS public.amep_event_plans (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  prompt TEXT,
  checklist JSONB,
  email_draft TEXT,
  budget_estimate TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Mental Wellness Ledger
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
-- AUTOMATION: Auth Identity Sync Trigger
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
  
  -- Auto-Provision Level 1 Stats
  INSERT INTO public.amep_user_stats (user_id, xp, level)
  VALUES (NEW.id, 0, 1);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- SEED DATA: For Immediate Testing
-- ==========================================
INSERT INTO public.amep_classes (id, name) VALUES ('C1', 'Cohort Alpha - CS'), ('C2', 'Cohort Beta - Engineering') ON CONFLICT DO NOTHING;

-- ==========================================
-- PERMISSIONS: Global Development Access
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