
-- Enable RLS on all tables if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Create or replace the function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Profiles table policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE USING (public.get_current_user_role() = 'admin');

-- Tickets table policies
DROP POLICY IF EXISTS "Users can view own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Agents and admins can view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Agents and admins can update tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can delete tickets" ON public.tickets;

CREATE POLICY "Users can view own tickets" ON public.tickets
  FOR SELECT USING (
    auth.uid() = customer_id OR 
    auth.uid() = assigned_to OR 
    public.get_current_user_role() IN ('admin', 'agent')
  );

CREATE POLICY "Agents and admins can view all tickets" ON public.tickets
  FOR SELECT USING (public.get_current_user_role() IN ('admin', 'agent'));

CREATE POLICY "Users can create tickets" ON public.tickets
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Agents and admins can update tickets" ON public.tickets
  FOR UPDATE USING (public.get_current_user_role() IN ('admin', 'agent'));

CREATE POLICY "Admins can delete tickets" ON public.tickets
  FOR DELETE USING (public.get_current_user_role() = 'admin');

-- Chat rooms policies
DROP POLICY IF EXISTS "Users can view own chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Agents and admins can view all chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can create chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Agents and admins can update chat rooms" ON public.chat_rooms;

CREATE POLICY "Users can view own chat rooms" ON public.chat_rooms
  FOR SELECT USING (
    auth.uid() = customer_id OR 
    auth.uid() = agent_id OR 
    public.get_current_user_role() IN ('admin', 'agent')
  );

CREATE POLICY "Agents and admins can view all chat rooms" ON public.chat_rooms
  FOR SELECT USING (public.get_current_user_role() IN ('admin', 'agent'));

CREATE POLICY "Users can create chat rooms" ON public.chat_rooms
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Agents and admins can update chat rooms" ON public.chat_rooms
  FOR UPDATE USING (public.get_current_user_role() IN ('admin', 'agent'));

-- Chat messages policies
DROP POLICY IF EXISTS "Users can view chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send chat messages" ON public.chat_messages;

CREATE POLICY "Users can view chat messages" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_rooms 
      WHERE id = chat_room_id 
      AND (customer_id = auth.uid() OR agent_id = auth.uid() OR public.get_current_user_role() IN ('admin', 'agent'))
    )
  );

CREATE POLICY "Users can send chat messages" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Messages policies (for ticket messages)
DROP POLICY IF EXISTS "Users can view ticket messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send ticket messages" ON public.messages;

CREATE POLICY "Users can view ticket messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tickets 
      WHERE id = ticket_id 
      AND (customer_id = auth.uid() OR assigned_to = auth.uid() OR public.get_current_user_role() IN ('admin', 'agent'))
    )
  );

CREATE POLICY "Users can send ticket messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Activities policies
DROP POLICY IF EXISTS "Admins can view all activities" ON public.activities;
DROP POLICY IF EXISTS "Users can create activities" ON public.activities;

CREATE POLICY "Admins can view all activities" ON public.activities
  FOR SELECT USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Users can create activities" ON public.activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);
