
-- Create chat_rooms table to store chat sessions
CREATE TABLE public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id),
  agent_id UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL CHECK (status IN ('active', 'waiting', 'closed')) DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_messages table to store messages
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_rooms
CREATE POLICY "Customers can view their own chat rooms"
  ON public.chat_rooms FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Agents can view all chat rooms"
  ON public.chat_rooms FOR SELECT
  USING (public.get_current_user_role() IN ('agent', 'admin'));

CREATE POLICY "Customers can create their own chat rooms"
  ON public.chat_rooms FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Agents can update chat rooms"
  ON public.chat_rooms FOR UPDATE
  USING (public.get_current_user_role() IN ('agent', 'admin'));

-- RLS policies for chat_messages
CREATE POLICY "Users can view messages in their chat rooms"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_rooms cr 
      WHERE cr.id = chat_room_id 
      AND (cr.customer_id = auth.uid() OR cr.agent_id = auth.uid() OR public.get_current_user_role() IN ('agent', 'admin'))
    )
  );

CREATE POLICY "Users can insert messages in their chat rooms"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_rooms cr 
      WHERE cr.id = chat_room_id 
      AND (cr.customer_id = auth.uid() OR cr.agent_id = auth.uid() OR public.get_current_user_role() IN ('agent', 'admin'))
    )
  );

-- Enable realtime for both tables
ALTER TABLE public.chat_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- Add tables to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'chat_rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END $$;
