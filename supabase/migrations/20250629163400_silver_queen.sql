/*
  # Safe Database Schema Migration

  1. Tables
    - Creates tables only if they don't exist
    - Handles existing constraints and indexes safely
    - Ensures all required tables are present

  2. Security
    - Enables RLS on all tables
    - Creates comprehensive role-based policies
    - Handles existing policies gracefully

  3. Functions and Triggers
    - Creates helper functions for security
    - Sets up automatic profile creation trigger
*/

-- Create user profiles table only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
    CREATE TABLE public.profiles (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      email text NOT NULL,
      name text NOT NULL,
      role text NOT NULL CHECK (role IN ('customer', 'agent', 'admin')),
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Create tickets table only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tickets' AND table_schema = 'public') THEN
    CREATE TABLE public.tickets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      description text NOT NULL,
      status text NOT NULL CHECK (status IN ('unassigned', 'assigned', 'in_progress', 'resolved', 'closed')),
      priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
      category text NOT NULL,
      customer_id uuid NOT NULL,
      assigned_to uuid,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Create messages table only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'messages' AND table_schema = 'public') THEN
    CREATE TABLE public.messages (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      ticket_id uuid NOT NULL,
      sender_id uuid NOT NULL,
      message text NOT NULL,
      created_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Create chat_rooms table only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'chat_rooms' AND table_schema = 'public') THEN
    CREATE TABLE public.chat_rooms (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id uuid NOT NULL,
      agent_id uuid,
      status text NOT NULL CHECK (status IN ('active', 'waiting', 'closed')) DEFAULT 'waiting',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Create chat_messages table only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'chat_messages' AND table_schema = 'public') THEN
    CREATE TABLE public.chat_messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      chat_room_id uuid NOT NULL,
      sender_id uuid NOT NULL,
      message text NOT NULL,
      created_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Create activities table only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'activities' AND table_schema = 'public') THEN
    CREATE TABLE public.activities (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id uuid,
      message text NOT NULL,
      created_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Add foreign key constraints only if they don't exist
DO $$
BEGIN
  -- Add profiles foreign key to auth.users if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_id_fkey' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Add tickets foreign keys if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tickets_customer_id_fkey' AND table_name = 'tickets'
  ) THEN
    ALTER TABLE public.tickets ADD CONSTRAINT tickets_customer_id_fkey 
    FOREIGN KEY (customer_id) REFERENCES public.profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tickets_assigned_to_fkey' AND table_name = 'tickets'
  ) THEN
    ALTER TABLE public.tickets ADD CONSTRAINT tickets_assigned_to_fkey 
    FOREIGN KEY (assigned_to) REFERENCES public.profiles(id);
  END IF;

  -- Add messages foreign keys if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'messages_ticket_id_fkey' AND table_name = 'messages'
  ) THEN
    ALTER TABLE public.messages ADD CONSTRAINT messages_ticket_id_fkey 
    FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'messages_sender_id_fkey' AND table_name = 'messages'
  ) THEN
    ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey 
    FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  -- Add chat_rooms foreign keys if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chat_rooms_customer_id_fkey' AND table_name = 'chat_rooms'
  ) THEN
    ALTER TABLE public.chat_rooms ADD CONSTRAINT chat_rooms_customer_id_fkey 
    FOREIGN KEY (customer_id) REFERENCES public.profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chat_rooms_agent_id_fkey' AND table_name = 'chat_rooms'
  ) THEN
    ALTER TABLE public.chat_rooms ADD CONSTRAINT chat_rooms_agent_id_fkey 
    FOREIGN KEY (agent_id) REFERENCES public.profiles(id);
  END IF;

  -- Add chat_messages foreign keys if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chat_messages_chat_room_id_fkey' AND table_name = 'chat_messages'
  ) THEN
    ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_chat_room_id_fkey 
    FOREIGN KEY (chat_room_id) REFERENCES public.chat_rooms(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chat_messages_sender_id_fkey' AND table_name = 'chat_messages'
  ) THEN
    ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_sender_id_fkey 
    FOREIGN KEY (sender_id) REFERENCES public.profiles(id);
  END IF;

  -- Add activities foreign key if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'activities_user_id_fkey' AND table_name = 'activities'
  ) THEN
    ALTER TABLE public.activities ADD CONSTRAINT activities_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

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

-- Create function to check if user ID exists in auth.users
CREATE OR REPLACE FUNCTION public.uid()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.uid();
$$;

-- Drop existing policies to avoid conflicts, then create new ones
DO $$
DECLARE
  pol_name text;
BEGIN
  -- Drop all existing policies on profiles
  FOR pol_name IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol_name) || ' ON public.profiles';
  END LOOP;

  -- Drop all existing policies on tickets
  FOR pol_name IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'tickets' AND schemaname = 'public'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol_name) || ' ON public.tickets';
  END LOOP;

  -- Drop all existing policies on messages
  FOR pol_name IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'messages' AND schemaname = 'public'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol_name) || ' ON public.messages';
  END LOOP;

  -- Drop all existing policies on chat_rooms
  FOR pol_name IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'chat_rooms' AND schemaname = 'public'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol_name) || ' ON public.chat_rooms';
  END LOOP;

  -- Drop all existing policies on chat_messages
  FOR pol_name IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'chat_messages' AND schemaname = 'public'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol_name) || ' ON public.chat_messages';
  END LOOP;

  -- Drop all existing policies on activities
  FOR pol_name IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'activities' AND schemaname = 'public'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol_name) || ' ON public.activities';
  END LOOP;
END $$;

-- RLS policies for profiles table
CREATE POLICY "profiles_anon_read_2025" ON public.profiles FOR SELECT TO anon USING (true);
CREATE POLICY "profiles_public_read_2025" ON public.profiles FOR SELECT TO public USING (true);
CREATE POLICY "profiles_auth_insert_2025" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "profiles_own_select_2025" ON public.profiles FOR SELECT USING (uid() = id);
CREATE POLICY "profiles_own_update_2025" ON public.profiles FOR UPDATE USING (uid() = id);
CREATE POLICY "profiles_own_insert_2025" ON public.profiles FOR INSERT WITH CHECK (uid() = id);
CREATE POLICY "profiles_admin_all_2025" ON public.profiles FOR ALL USING (get_current_user_role() = 'admin');

-- RLS policies for tickets table
CREATE POLICY "tickets_view_own_2025" ON public.tickets FOR SELECT USING (
  uid() = customer_id OR 
  uid() = assigned_to OR 
  get_current_user_role() IN ('admin', 'agent')
);
CREATE POLICY "tickets_customer_create_2025" ON public.tickets FOR INSERT WITH CHECK (
  get_current_user_role() = 'customer' AND customer_id = uid()
);
CREATE POLICY "tickets_staff_manage_2025" ON public.tickets FOR ALL USING (
  get_current_user_role() IN ('admin', 'agent')
);

-- RLS policies for messages table
CREATE POLICY "messages_view_ticket_2025" ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tickets 
    WHERE tickets.id = messages.ticket_id 
    AND (tickets.customer_id = uid() OR tickets.assigned_to = uid() OR get_current_user_role() IN ('admin', 'agent'))
  )
);
CREATE POLICY "messages_create_own_2025" ON public.messages FOR INSERT WITH CHECK (uid() = sender_id);

-- RLS policies for chat_rooms table
CREATE POLICY "chat_rooms_participant_2025" ON public.chat_rooms FOR SELECT USING (
  uid() = customer_id OR 
  uid() = agent_id OR 
  get_current_user_role() IN ('admin', 'agent')
);
CREATE POLICY "chat_rooms_customer_create_2025" ON public.chat_rooms FOR INSERT WITH CHECK (customer_id = uid());
CREATE POLICY "chat_rooms_staff_manage_2025" ON public.chat_rooms FOR UPDATE USING (
  get_current_user_role() IN ('agent', 'admin')
);

-- RLS policies for chat_messages table
CREATE POLICY "chat_messages_room_access_2025" ON public.chat_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chat_rooms cr 
    WHERE cr.id = chat_messages.chat_room_id 
    AND (cr.customer_id = uid() OR cr.agent_id = uid() OR get_current_user_role() IN ('agent', 'admin'))
  )
);
CREATE POLICY "chat_messages_participant_send_2025" ON public.chat_messages FOR INSERT WITH CHECK (
  uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.chat_rooms cr 
    WHERE cr.id = chat_messages.chat_room_id 
    AND (cr.customer_id = uid() OR cr.agent_id = uid() OR get_current_user_role() IN ('agent', 'admin'))
  )
);

-- RLS policies for activities table
CREATE POLICY "activities_admin_view_2025" ON public.activities FOR SELECT USING (get_current_user_role() = 'admin');
CREATE POLICY "activities_user_create_2025" ON public.activities FOR INSERT WITH CHECK (uid() = user_id);

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

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON public.tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON public.tickets(priority);
CREATE INDEX IF NOT EXISTS idx_messages_ticket_id ON public.messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_customer_id ON public.chat_rooms(customer_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_agent_id ON public.chat_rooms(agent_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON public.chat_messages(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);