/*
  # Complete Helpdesk Schema Setup

  1. New Tables
    - `profiles` - User profiles with roles (customer, agent, admin)
    - `tickets` - Support tickets with status and priority
    - `messages` - Ticket comments and replies
    - `chat_rooms` - Live chat sessions
    - `chat_messages` - Chat messages
    - `activities` - System activity logs

  2. Security
    - Enable RLS on all tables
    - Add comprehensive policies for role-based access
    - Create function to get current user role

  3. Triggers
    - Auto-create profile when user signs up
*/

-- Drop existing policies to avoid conflicts
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all existing policies on profiles table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.profiles';
    END LOOP;
    
    -- Drop all existing policies on tickets table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'tickets' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.tickets';
    END LOOP;
    
    -- Drop all existing policies on messages table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'messages' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.messages';
    END LOOP;
    
    -- Drop all existing policies on chat_rooms table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'chat_rooms' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.chat_rooms';
    END LOOP;
    
    -- Drop all existing policies on chat_messages table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'chat_messages' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.chat_messages';
    END LOOP;
    
    -- Drop all existing policies on activities table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'activities' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.activities';
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

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Create function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- RLS policies for profiles table
CREATE POLICY "profiles_select_anon" ON public.profiles FOR SELECT TO anon USING (true);
CREATE POLICY "profiles_select_public" ON public.profiles FOR SELECT TO public USING (true);
CREATE POLICY "profiles_insert_authenticated" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_admin_select" ON public.profiles FOR SELECT USING (get_current_user_role() = 'admin');
CREATE POLICY "profiles_admin_update" ON public.profiles FOR UPDATE USING (get_current_user_role() = 'admin');
CREATE POLICY "profiles_admin_insert" ON public.profiles FOR INSERT WITH CHECK (get_current_user_role() = 'admin');
CREATE POLICY "profiles_admin_delete" ON public.profiles FOR DELETE USING (get_current_user_role() = 'admin');

-- RLS policies for tickets table
CREATE POLICY "tickets_select_own" ON public.tickets FOR SELECT USING (
  auth.uid() = customer_id OR 
  auth.uid() = assigned_to OR 
  get_current_user_role() IN ('admin', 'agent')
);
CREATE POLICY "tickets_select_customer" ON public.tickets FOR SELECT USING (
  get_current_user_role() = 'customer' AND customer_id = auth.uid()
);
CREATE POLICY "tickets_select_staff" ON public.tickets FOR SELECT USING (
  get_current_user_role() IN ('admin', 'agent')
);
CREATE POLICY "tickets_insert_customer" ON public.tickets FOR INSERT WITH CHECK (
  get_current_user_role() = 'customer' AND customer_id = auth.uid()
);
CREATE POLICY "tickets_insert_own" ON public.tickets FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "tickets_update_staff" ON public.tickets FOR UPDATE USING (
  get_current_user_role() IN ('admin', 'agent')
);
CREATE POLICY "tickets_delete_admin" ON public.tickets FOR DELETE USING (get_current_user_role() = 'admin');

-- RLS policies for messages table
CREATE POLICY "messages_select_ticket_access" ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tickets 
    WHERE id = ticket_id 
    AND (customer_id = auth.uid() OR assigned_to = auth.uid() OR get_current_user_role() IN ('admin', 'agent'))
  )
);
CREATE POLICY "messages_insert_sender" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- RLS policies for chat_rooms table
CREATE POLICY "chat_rooms_select_participant" ON public.chat_rooms FOR SELECT USING (
  auth.uid() = customer_id OR 
  auth.uid() = agent_id OR 
  get_current_user_role() IN ('admin', 'agent')
);
CREATE POLICY "chat_rooms_select_customer" ON public.chat_rooms FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "chat_rooms_select_staff" ON public.chat_rooms FOR SELECT USING (
  get_current_user_role() IN ('agent', 'admin')
);
CREATE POLICY "chat_rooms_insert_customer" ON public.chat_rooms FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "chat_rooms_insert_own" ON public.chat_rooms FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "chat_rooms_update_staff" ON public.chat_rooms FOR UPDATE USING (
  get_current_user_role() IN ('agent', 'admin')
);

-- RLS policies for chat_messages table
CREATE POLICY "chat_messages_select_room_access" ON public.chat_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chat_rooms cr 
    WHERE cr.id = chat_room_id 
    AND (cr.customer_id = auth.uid() OR cr.agent_id = auth.uid() OR get_current_user_role() IN ('agent', 'admin'))
  )
);
CREATE POLICY "chat_messages_insert_room_participant" ON public.chat_messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_rooms cr 
    WHERE cr.id = chat_room_id 
    AND (cr.customer_id = auth.uid() OR cr.agent_id = auth.uid() OR get_current_user_role() IN ('agent', 'admin'))
  )
);
CREATE POLICY "chat_messages_insert_sender" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- RLS policies for activities table
CREATE POLICY "activities_select_admin" ON public.activities FOR SELECT USING (get_current_user_role() = 'admin');
CREATE POLICY "activities_insert_user" ON public.activities FOR INSERT WITH CHECK (auth.uid() = user_id);

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

-- Add foreign key constraint for profiles table
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