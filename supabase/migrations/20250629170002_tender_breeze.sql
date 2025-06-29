/*
  # Fix authentication and profile setup

  1. Ensure all required tables exist
  2. Fix RLS policies for proper authentication
  3. Ensure trigger function works correctly
  4. Add proper indexes
*/

-- Ensure profiles table exists with correct structure
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('customer', 'agent', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraint to auth.users if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_id_fkey' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create helper function for getting current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "profiles_anon_read_2025" ON public.profiles;
DROP POLICY IF EXISTS "profiles_public_read_2025" ON public.profiles;
DROP POLICY IF EXISTS "profiles_auth_insert_2025" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_select_2025" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_update_2025" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_insert_2025" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all_2025" ON public.profiles;

-- Create comprehensive RLS policies for profiles
CREATE POLICY "profiles_anon_read_2025" ON public.profiles 
  FOR SELECT TO anon USING (true);

CREATE POLICY "profiles_public_read_2025" ON public.profiles 
  FOR SELECT TO public USING (true);

CREATE POLICY "profiles_auth_insert_2025" ON public.profiles 
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "profiles_own_select_2025" ON public.profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_own_update_2025" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_own_insert_2025" ON public.profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_admin_all_2025" ON public.profiles 
  FOR ALL USING (get_current_user_role() = 'admin');

-- Create or replace the trigger function for new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    role = COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    updated_at = now();
  RETURN NEW;
END;
$$;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Ensure tickets table exists (basic structure)
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL CHECK (status IN ('unassigned', 'assigned', 'in_progress', 'resolved', 'closed')),
  priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category text NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.profiles(id),
  assigned_to uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on tickets
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for tickets
DROP POLICY IF EXISTS "tickets_view_own_2025" ON public.tickets;
DROP POLICY IF EXISTS "tickets_customer_create_2025" ON public.tickets;
DROP POLICY IF EXISTS "tickets_staff_manage_2025" ON public.tickets;

CREATE POLICY "tickets_view_own_2025" ON public.tickets 
  FOR SELECT USING (
    auth.uid() = customer_id OR 
    auth.uid() = assigned_to OR 
    get_current_user_role() IN ('admin', 'agent')
  );

CREATE POLICY "tickets_customer_create_2025" ON public.tickets 
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'customer' AND customer_id = auth.uid()
  );

CREATE POLICY "tickets_staff_manage_2025" ON public.tickets 
  FOR ALL USING (
    get_current_user_role() IN ('admin', 'agent')
  );

-- Create indexes for tickets
CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON public.tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON public.tickets(priority);

-- Verify setup
DO $$
DECLARE
  profile_count integer;
  policy_count integer;
BEGIN
  -- Check if profiles table exists
  SELECT COUNT(*) INTO profile_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'profiles';
  
  -- Check if policies exist
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'profiles' AND schemaname = 'public';
  
  RAISE NOTICE 'Profiles table exists: %', (profile_count > 0);
  RAISE NOTICE 'Number of policies on profiles: %', policy_count;
  
  IF profile_count = 0 THEN
    RAISE EXCEPTION 'Profiles table was not created successfully';
  END IF;
  
  IF policy_count = 0 THEN
    RAISE EXCEPTION 'No RLS policies found on profiles table';
  END IF;
  
  RAISE NOTICE 'Database setup completed successfully!';
END $$;