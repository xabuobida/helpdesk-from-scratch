/*
  # Create helpdesk database schema

  1. New Tables
    - `profiles` - User profiles with roles (customer, agent, admin)
    - `tickets` - Support tickets
    - `messages` - Ticket messages/comments
    - `chat_rooms` - Live chat sessions
    - `chat_messages` - Chat messages
    - `activities` - System activity log

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
    - Create function to get current user role

  3. Functions
    - `get_current_user_role()` - Helper function for RLS policies
    - `handle_new_user()` - Trigger function for new user registration
*/

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
CREATE POLICY "Allow anon read" ON public.profiles FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read for all" ON public.profiles FOR SELECT TO public USING (true);
CREATE POLICY "Allow authenticated insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow insert for authenticated users" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (get_current_user_role() = 'admin');
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (get_current_user_role() = 'admin');
CREATE POLICY "Admins can insert any profile" ON public.profiles FOR INSERT WITH CHECK (get_current_user_role() = 'admin');
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (get_current_user_role() = 'admin');
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING (get_current_user_role() = 'admin');

-- RLS policies for tickets table
CREATE POLICY "Users can view own tickets" ON public.tickets FOR SELECT USING (
  auth.uid() = customer_id OR 
  auth.uid() = assigned_to OR 
  get_current_user_role() IN ('admin', 'agent')
);
CREATE POLICY "Customers can view their own tickets" ON public.tickets FOR SELECT USING (
  get_current_user_role() = 'customer' AND customer_id = auth.uid()
);
CREATE POLICY "Agents and admins can view all tickets" ON public.tickets FOR SELECT USING (
  get_current_user_role() IN ('admin', 'agent')
);
CREATE POLICY "Admins can view all tickets" ON public.tickets FOR SELECT USING (get_current_user_role() = 'admin');
CREATE POLICY "Users can create tickets" ON public.tickets FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customers can create tickets" ON public.tickets FOR INSERT WITH CHECK (
  get_current_user_role() = 'customer' AND customer_id = auth.uid()
);
CREATE POLICY "Agents and admins can update tickets" ON public.tickets FOR UPDATE USING (
  get_current_user_role() IN ('admin', 'agent')
);
CREATE POLICY "Admins can delete tickets" ON public.tickets FOR DELETE USING (get_current_user_role() = 'admin');

-- RLS policies for messages table
CREATE POLICY "Users can view ticket messages" ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tickets 
    WHERE id = ticket_id 
    AND (customer_id = auth.uid() OR assigned_to = auth.uid() OR get_current_user_role() IN ('admin', 'agent'))
  )
);
CREATE POLICY "Users can send ticket messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- RLS policies for chat_rooms table
CREATE POLICY "Users can view own chat rooms" ON public.chat_rooms FOR SELECT USING (
  auth.uid() = customer_id OR 
  auth.uid() = agent_id OR 
  get_current_user_role() IN ('admin', 'agent')
);
CREATE POLICY "Customers can view their own chat rooms" ON public.chat_rooms FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Agents can view all chat rooms" ON public.chat_rooms FOR SELECT USING (
  get_current_user_role() IN ('agent', 'admin')
);
CREATE POLICY "Agents and admins can view all chat rooms" ON public.chat_rooms FOR SELECT USING (
  get_current_user_role() IN ('admin', 'agent')
);
CREATE POLICY "Users can create chat rooms" ON public.chat_rooms FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customers can create their own chat rooms" ON public.chat_rooms FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Agents can update chat rooms" ON public.chat_rooms FOR UPDATE USING (
  get_current_user_role() IN ('agent', 'admin')
);
CREATE POLICY "Agents and admins can update chat rooms" ON public.chat_rooms FOR UPDATE USING (
  get_current_user_role() IN ('admin', 'agent')
);

-- RLS policies for chat_messages table
CREATE POLICY "Users can view messages in their chat rooms" ON public.chat_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chat_rooms cr 
    WHERE cr.id = chat_room_id 
    AND (cr.customer_id = auth.uid() OR cr.agent_id = auth.uid() OR get_current_user_role() IN ('agent', 'admin'))
  )
);
CREATE POLICY "Users can view chat messages" ON public.chat_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chat_rooms 
    WHERE id = chat_room_id 
    AND (customer_id = auth.uid() OR agent_id = auth.uid() OR get_current_user_role() IN ('admin', 'agent'))
  )
);
CREATE POLICY "Users can insert messages in their chat rooms" ON public.chat_messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_rooms cr 
    WHERE cr.id = chat_room_id 
    AND (cr.customer_id = auth.uid() OR cr.agent_id = auth.uid() OR get_current_user_role() IN ('agent', 'admin'))
  )
);
CREATE POLICY "Users can send chat messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- RLS policies for activities table
CREATE POLICY "Admins can view all activities" ON public.activities FOR SELECT USING (get_current_user_role() = 'admin');
CREATE POLICY "Users can create activities" ON public.activities FOR INSERT WITH CHECK (auth.uid() = user_id);

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