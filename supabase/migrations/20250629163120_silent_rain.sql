/*
  # Complete database schema setup with robust policy management

  1. Tables
    - `profiles` - User profiles with roles
    - `tickets` - Support tickets
    - `messages` - Ticket messages/comments
    - `chat_rooms` - Live chat sessions
    - `chat_messages` - Chat messages
    - `activities` - System activity logs

  2. Security
    - Enable RLS on all tables
    - Comprehensive policies for all user roles
    - Secure functions for role checking

  3. Triggers
    - Auto-create profile on user signup
*/

-- First, disable RLS temporarily to avoid conflicts during cleanup
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activities DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies using a more robust approach
DO $$
DECLARE
    pol_record RECORD;
BEGIN
    -- Drop policies for profiles
    FOR pol_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      pol_record.policyname, pol_record.schemaname, pol_record.tablename);
    END LOOP;
    
    -- Drop policies for tickets
    FOR pol_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'tickets'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      pol_record.policyname, pol_record.schemaname, pol_record.tablename);
    END LOOP;
    
    -- Drop policies for messages
    FOR pol_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'messages'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      pol_record.policyname, pol_record.schemaname, pol_record.tablename);
    END LOOP;
    
    -- Drop policies for chat_rooms
    FOR pol_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'chat_rooms'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      pol_record.policyname, pol_record.schemaname, pol_record.tablename);
    END LOOP;
    
    -- Drop policies for chat_messages
    FOR pol_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'chat_messages'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      pol_record.policyname, pol_record.schemaname, pol_record.tablename);
    END LOOP;
    
    -- Drop policies for activities
    FOR pol_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'activities'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      pol_record.policyname, pol_record.schemaname, pol_record.tablename);
    END LOOP;
END $$;

-- Create user profiles table to store user roles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('customer', 'agent', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tickets table
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

-- Create messages table for ticket comments
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create chat rooms table
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.profiles(id),
  agent_id uuid REFERENCES public.profiles(id),
  status text NOT NULL CHECK (status IN ('active', 'waiting', 'closed')) DEFAULT 'waiting',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chat messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id),
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create activities table for system logs
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles table
CREATE POLICY "profiles_anon_read_2025" ON public.profiles FOR SELECT TO anon USING (true);
CREATE POLICY "profiles_public_read_2025" ON public.profiles FOR SELECT TO public USING (true);
CREATE POLICY "profiles_auth_insert_2025" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "profiles_own_select_2025" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_own_update_2025" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_own_insert_2025" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_admin_all_2025" ON public.profiles FOR ALL USING (get_current_user_role() = 'admin');

-- RLS policies for tickets table
CREATE POLICY "tickets_view_own_2025" ON public.tickets FOR SELECT USING (
  auth.uid() = customer_id OR 
  auth.uid() = assigned_to OR 
  get_current_user_role() IN ('admin', 'agent')
);
CREATE POLICY "tickets_customer_create_2025" ON public.tickets FOR INSERT WITH CHECK (
  get_current_user_role() = 'customer' AND customer_id = auth.uid()
);
CREATE POLICY "tickets_staff_manage_2025" ON public.tickets FOR ALL USING (
  get_current_user_role() IN ('admin', 'agent')
);

-- RLS policies for messages table
CREATE POLICY "messages_view_ticket_2025" ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tickets 
    WHERE id = ticket_id 
    AND (customer_id = auth.uid() OR assigned_to = auth.uid() OR get_current_user_role() IN ('admin', 'agent'))
  )
);
CREATE POLICY "messages_create_own_2025" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- RLS policies for chat_rooms table
CREATE POLICY "chat_rooms_participant_2025" ON public.chat_rooms FOR SELECT USING (
  auth.uid() = customer_id OR 
  auth.uid() = agent_id OR 
  get_current_user_role() IN ('admin', 'agent')
);
CREATE POLICY "chat_rooms_customer_create_2025" ON public.chat_rooms FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "chat_rooms_staff_manage_2025" ON public.chat_rooms FOR UPDATE USING (
  get_current_user_role() IN ('agent', 'admin')
);

-- RLS policies for chat_messages table
CREATE POLICY "chat_messages_room_access_2025" ON public.chat_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chat_rooms cr 
    WHERE cr.id = chat_room_id 
    AND (cr.customer_id = auth.uid() OR cr.agent_id = auth.uid() OR get_current_user_role() IN ('agent', 'admin'))
  )
);
CREATE POLICY "chat_messages_participant_send_2025" ON public.chat_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.chat_rooms cr 
    WHERE cr.id = chat_room_id 
    AND (cr.customer_id = auth.uid() OR cr.agent_id = auth.uid() OR get_current_user_role() IN ('agent', 'admin'))
  )
);

-- RLS policies for activities table
CREATE POLICY "activities_admin_view_2025" ON public.activities FOR SELECT USING (get_current_user_role() = 'admin');
CREATE POLICY "activities_user_create_2025" ON public.activities FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create trigger function to handle new user registration
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
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add foreign key constraint for profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_id_fkey'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;