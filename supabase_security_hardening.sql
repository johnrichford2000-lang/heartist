-- ==============================================================================
-- HEARTIST ROW LEVEL SECURITY (RLS) HARDENING SCRIPT
-- Patakbuhin ito sa: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Helper Function: Check if the currently authenticated user is an Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  current_email TEXT;
  admin_list JSONB;
BEGIN
  current_email := auth.jwt() ->> 'email';
  IF current_email IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 1a. Primary hardcoded admin
  IF lower(current_email) = 'heartistrichford@gmail.com' THEN
    RETURN TRUE;
  END IF;

  -- 1b. Check admin_emails in system_settings
  SELECT value INTO admin_list FROM public.system_settings WHERE id = 'admin_emails';
  IF admin_list IS NOT NULL THEN
    IF jsonb_typeof(admin_list) = 'array' THEN
      IF admin_list ? current_email THEN
        RETURN TRUE;
      END IF;
    END IF;
  END IF;

  -- 1c. Check if user profile has Admin badge
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (lower(badge) = 'admin')
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------------------------
-- 2. SYSTEM SETTINGS
-- ------------------------------------------------------------------------------
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Settings all" ON public.system_settings;
DROP POLICY IF EXISTS "System settings read public" ON public.system_settings;
DROP POLICY IF EXISTS "System settings write admin only" ON public.system_settings;
DROP POLICY IF EXISTS "System settings update admin only" ON public.system_settings;
DROP POLICY IF EXISTS "System settings delete admin only" ON public.system_settings;

CREATE POLICY "System settings read public" 
  ON public.system_settings FOR SELECT 
  USING (true);

CREATE POLICY "System settings write admin only" 
  ON public.system_settings FOR INSERT 
  WITH CHECK (public.is_admin());

CREATE POLICY "System settings update admin only" 
  ON public.system_settings FOR UPDATE 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

CREATE POLICY "System settings delete admin only" 
  ON public.system_settings FOR DELETE 
  USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 3. ANNOUNCEMENTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Announcements all" ON public.announcements;
DROP POLICY IF EXISTS "Announcements read public" ON public.announcements;
DROP POLICY IF EXISTS "Announcements write admin only" ON public.announcements;
DROP POLICY IF EXISTS "Announcements update admin only" ON public.announcements;
DROP POLICY IF EXISTS "Announcements delete admin only" ON public.announcements;

CREATE POLICY "Announcements read public" 
  ON public.announcements FOR SELECT 
  USING (true);

CREATE POLICY "Announcements write admin only" 
  ON public.announcements FOR INSERT 
  WITH CHECK (public.is_admin());

CREATE POLICY "Announcements update admin only" 
  ON public.announcements FOR UPDATE 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

CREATE POLICY "Announcements delete admin only" 
  ON public.announcements FOR DELETE 
  USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 4. PROFILES
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles can be read by all" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles read public" ON public.profiles;
DROP POLICY IF EXISTS "Profiles insert own or admin" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update own or admin" ON public.profiles;
DROP POLICY IF EXISTS "Profiles delete admin only" ON public.profiles;

CREATE POLICY "Profiles read public" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Profiles insert own or admin" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "Profiles update own or admin" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "Profiles delete admin only" 
  ON public.profiles FOR DELETE 
  USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 5. POSTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Posts select all" ON public.posts;
DROP POLICY IF EXISTS "Posts insert all" ON public.posts;
DROP POLICY IF EXISTS "Posts update all" ON public.posts;
DROP POLICY IF EXISTS "Posts delete all" ON public.posts;
DROP POLICY IF EXISTS "Posts read public" ON public.posts;
DROP POLICY IF EXISTS "Posts insert authenticated" ON public.posts;
DROP POLICY IF EXISTS "Posts update authorized" ON public.posts;
DROP POLICY IF EXISTS "Posts delete author or admin" ON public.posts;

CREATE POLICY "Posts read public" 
  ON public.posts FOR SELECT 
  USING (true);

CREATE POLICY "Posts insert authenticated" 
  ON public.posts FOR INSERT 
  WITH CHECK (auth.uid() = author_id OR public.is_admin());

-- Allows author to edit post, authenticated users to toggle likes, and admins to moderate
CREATE POLICY "Posts update authorized" 
  ON public.posts FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- Strictly prevents unauthorized deletion
CREATE POLICY "Posts delete author or admin" 
  ON public.posts FOR DELETE 
  USING (auth.uid() = author_id OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 6. COMMENTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Comments select all" ON public.comments;
DROP POLICY IF EXISTS "Comments insert all" ON public.comments;
DROP POLICY IF EXISTS "Comments update all" ON public.comments;
DROP POLICY IF EXISTS "Comments delete all" ON public.comments;
DROP POLICY IF EXISTS "Comments read public" ON public.comments;
DROP POLICY IF EXISTS "Comments insert authenticated" ON public.comments;
DROP POLICY IF EXISTS "Comments update authorized" ON public.comments;
DROP POLICY IF EXISTS "Comments delete author or admin" ON public.comments;

CREATE POLICY "Comments read public" 
  ON public.comments FOR SELECT 
  USING (true);

CREATE POLICY "Comments insert authenticated" 
  ON public.comments FOR INSERT 
  WITH CHECK (auth.uid() = author_id OR public.is_admin());

CREATE POLICY "Comments update authorized" 
  ON public.comments FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Comments delete author or admin" 
  ON public.comments FOR DELETE 
  USING (auth.uid() = author_id OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 7. PRAYERS
-- ------------------------------------------------------------------------------
ALTER TABLE public.prayers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Prayers select all" ON public.prayers;
DROP POLICY IF EXISTS "Prayers insert all" ON public.prayers;
DROP POLICY IF EXISTS "Prayers update all" ON public.prayers;
DROP POLICY IF EXISTS "Prayers delete all" ON public.prayers;
DROP POLICY IF EXISTS "Prayers read public or private owner" ON public.prayers;
DROP POLICY IF EXISTS "Prayers insert authenticated" ON public.prayers;
DROP POLICY IF EXISTS "Prayers update authorized" ON public.prayers;
DROP POLICY IF EXISTS "Prayers delete author or admin" ON public.prayers;

-- Private prayers only visible to author or admin; public prayers visible to all
CREATE POLICY "Prayers read public or private owner" 
  ON public.prayers FOR SELECT 
  USING (NOT is_private OR auth.uid() = author_id OR public.is_admin());

CREATE POLICY "Prayers insert authenticated" 
  ON public.prayers FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated' OR public.is_admin());

CREATE POLICY "Prayers update authorized" 
  ON public.prayers FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Prayers delete author or admin" 
  ON public.prayers FOR DELETE 
  USING (auth.uid() = author_id OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 8. NOTIFICATIONS
-- ------------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Notifications all" ON public.notifications;
DROP POLICY IF EXISTS "Notifications read recipient only" ON public.notifications;
DROP POLICY IF EXISTS "Notifications insert authenticated" ON public.notifications;
DROP POLICY IF EXISTS "Notifications update recipient only" ON public.notifications;
DROP POLICY IF EXISTS "Notifications delete recipient only" ON public.notifications;

CREATE POLICY "Notifications read recipient only" 
  ON public.notifications FOR SELECT 
  USING (auth.uid()::text = recipient_id OR public.is_admin());

CREATE POLICY "Notifications insert authenticated" 
  ON public.notifications FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated' OR public.is_admin());

CREATE POLICY "Notifications update recipient only" 
  ON public.notifications FOR UPDATE 
  USING (auth.uid()::text = recipient_id OR public.is_admin());

CREATE POLICY "Notifications delete recipient only" 
  ON public.notifications FOR DELETE 
  USING (auth.uid()::text = recipient_id OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 9. MODERATION: REPORTS, APPEALS, PENALTIES, WARNINGS
-- ------------------------------------------------------------------------------
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Reports all" ON public.reports;
DROP POLICY IF EXISTS "Reports insert any authenticated" ON public.reports;
DROP POLICY IF EXISTS "Reports select admin only" ON public.reports;
DROP POLICY IF EXISTS "Reports update admin only" ON public.reports;
DROP POLICY IF EXISTS "Reports delete admin only" ON public.reports;

CREATE POLICY "Reports insert any authenticated" 
  ON public.reports FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Reports select admin only" 
  ON public.reports FOR SELECT 
  USING (public.is_admin());

CREATE POLICY "Reports update admin only" 
  ON public.reports FOR UPDATE 
  USING (public.is_admin());

CREATE POLICY "Reports delete admin only" 
  ON public.reports FOR DELETE 
  USING (public.is_admin());

-- Appeals
ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Appeals all" ON public.appeals;
DROP POLICY IF EXISTS "Appeals select owner or admin" ON public.appeals;
DROP POLICY IF EXISTS "Appeals insert owner" ON public.appeals;
DROP POLICY IF EXISTS "Appeals update admin only" ON public.appeals;
DROP POLICY IF EXISTS "Appeals delete admin only" ON public.appeals;

CREATE POLICY "Appeals select owner or admin" 
  ON public.appeals FOR SELECT 
  USING (auth.uid()::text = user_id OR public.is_admin());

CREATE POLICY "Appeals insert owner" 
  ON public.appeals FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id OR public.is_admin());

CREATE POLICY "Appeals update admin only" 
  ON public.appeals FOR UPDATE 
  USING (public.is_admin());

CREATE POLICY "Appeals delete admin only" 
  ON public.appeals FOR DELETE 
  USING (public.is_admin());

-- Penalties
ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Penalties all" ON public.penalties;
DROP POLICY IF EXISTS "Penalties select user or admin" ON public.penalties;
DROP POLICY IF EXISTS "Penalties write admin only" ON public.penalties;
DROP POLICY IF EXISTS "Penalties update admin only" ON public.penalties;
DROP POLICY IF EXISTS "Penalties delete admin only" ON public.penalties;

CREATE POLICY "Penalties select user or admin" 
  ON public.penalties FOR SELECT 
  USING (auth.uid()::text = user_id OR public.is_admin());

CREATE POLICY "Penalties write admin only" 
  ON public.penalties FOR INSERT 
  WITH CHECK (public.is_admin());

CREATE POLICY "Penalties update admin only" 
  ON public.penalties FOR UPDATE 
  USING (public.is_admin());

CREATE POLICY "Penalties delete admin only" 
  ON public.penalties FOR DELETE 
  USING (public.is_admin());

-- Warnings
ALTER TABLE public.warnings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Warnings all" ON public.warnings;
DROP POLICY IF EXISTS "Warnings select user or admin" ON public.warnings;
DROP POLICY IF EXISTS "Warnings write admin only" ON public.warnings;
DROP POLICY IF EXISTS "Warnings update admin only" ON public.warnings;
DROP POLICY IF EXISTS "Warnings delete admin only" ON public.warnings;

CREATE POLICY "Warnings select user or admin" 
  ON public.warnings FOR SELECT 
  USING (auth.uid()::text = user_id OR public.is_admin());

CREATE POLICY "Warnings write admin only" 
  ON public.warnings FOR INSERT 
  WITH CHECK (public.is_admin());

CREATE POLICY "Warnings update admin only" 
  ON public.warnings FOR UPDATE 
  USING (public.is_admin());

CREATE POLICY "Warnings delete admin only" 
  ON public.warnings FOR DELETE 
  USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 10. FORMS (Contact Us)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Forms insert public" ON public.forms;
DROP POLICY IF EXISTS "Forms select admin only" ON public.forms;
DROP POLICY IF EXISTS "Forms update admin only" ON public.forms;
DROP POLICY IF EXISTS "Forms delete admin only" ON public.forms;

CREATE POLICY "Forms insert public" 
  ON public.forms FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Forms select admin only" 
  ON public.forms FOR SELECT 
  USING (public.is_admin());

CREATE POLICY "Forms update admin only" 
  ON public.forms FOR UPDATE 
  USING (public.is_admin());

CREATE POLICY "Forms delete admin only" 
  ON public.forms FOR DELETE 
  USING (public.is_admin());
