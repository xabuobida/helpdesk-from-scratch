/*
  # Verify and fix database tables

  1. Check existing tables
  2. Ensure all required tables exist with proper structure
  3. Verify RLS policies are in place
  4. Add any missing indexes
*/

-- First, let's check what tables exist
DO $$
BEGIN
  RAISE NOTICE 'Checking existing tables...';
  
  -- List all tables in public schema
  FOR rec IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  LOOP
    RAISE NOTICE 'Found table: %', rec.table_name;
  END LOOP;
END $$;

-- Ensure all tables exist with correct structure
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('customer', 'agent', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tickets (
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

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  agent_id uuid,
  status text NOT NULL CHECK (status IN ('active', 'waiting', 'closed')) DEFAULT 'waiting',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_room_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
  -- profiles to auth.users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_id_fkey' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- tickets foreign keys
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

  -- messages foreign keys
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

  -- chat_rooms foreign keys
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

  -- chat_messages foreign keys
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

  -- activities foreign key
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

-- Ensure helper functions exist
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Create indexes for better performance
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

-- Final verification
DO $$
DECLARE
  table_count integer;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'tickets', 'messages', 'chat_rooms', 'chat_messages', 'activities');
  
  RAISE NOTICE 'Total tables found: %', table_count;
  
  IF table_count = 6 THEN
    RAISE NOTICE 'All required tables are present!';
  ELSE
    RAISE NOTICE 'Missing tables detected. Expected 6, found %', table_count;
  END IF;
END $$;