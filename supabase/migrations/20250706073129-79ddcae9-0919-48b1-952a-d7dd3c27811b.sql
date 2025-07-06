-- Add ticket_id to chat_rooms to link each chat room with a specific ticket
ALTER TABLE public.chat_rooms 
ADD COLUMN ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE;

-- Add ticket_id to chat_messages for direct ticket linking
ALTER TABLE public.chat_messages 
ADD COLUMN ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_chat_rooms_ticket_id ON public.chat_rooms(ticket_id);
CREATE INDEX idx_chat_messages_ticket_id ON public.chat_messages(ticket_id);

-- Update RLS policies for chat_rooms to include ticket access
DROP POLICY IF EXISTS "chat_rooms_participant_2025" ON public.chat_rooms;
CREATE POLICY "chat_rooms_ticket_access_2025" 
ON public.chat_rooms 
FOR SELECT 
USING (
  -- Direct participants
  (uid() = customer_id OR uid() = agent_id) OR
  -- Staff can see all
  (get_current_user_role() = ANY (ARRAY['admin'::text, 'agent'::text])) OR
  -- Ticket participants can see the chat room
  (ticket_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.tickets t 
    WHERE t.id = ticket_id 
    AND (t.customer_id = uid() OR t.assigned_to = uid() OR get_current_user_role() = ANY (ARRAY['admin'::text, 'agent'::text]))
  ))
);

-- Update RLS policies for chat_messages to include ticket access
DROP POLICY IF EXISTS "chat_messages_room_access_2025" ON public.chat_messages;
CREATE POLICY "chat_messages_ticket_access_2025" 
ON public.chat_messages 
FOR SELECT 
USING (
  -- Via chat room access
  EXISTS (
    SELECT 1 FROM chat_rooms cr 
    WHERE cr.id = chat_messages.chat_room_id 
    AND (
      (cr.customer_id = uid() OR cr.agent_id = uid()) OR 
      (get_current_user_role() = ANY (ARRAY['agent'::text, 'admin'::text])) OR
      (cr.ticket_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.tickets t 
        WHERE t.id = cr.ticket_id 
        AND (t.customer_id = uid() OR t.assigned_to = uid() OR get_current_user_role() = ANY (ARRAY['admin'::text, 'agent'::text]))
      ))
    )
  ) OR
  -- Direct ticket access
  (ticket_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.tickets t 
    WHERE t.id = ticket_id 
    AND (t.customer_id = uid() OR t.assigned_to = uid() OR get_current_user_role() = ANY (ARRAY['admin'::text, 'agent'::text]))
  ))
);

-- Function to auto-create chat room when ticket is created
CREATE OR REPLACE FUNCTION public.create_chat_room_for_ticket()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a chat room for the new ticket
  INSERT INTO public.chat_rooms (ticket_id, customer_id, agent_id, status)
  VALUES (NEW.id, NEW.customer_id, NEW.assigned_to, 
    CASE WHEN NEW.assigned_to IS NOT NULL THEN 'active' ELSE 'waiting' END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create chat room when ticket is created
CREATE TRIGGER create_chat_room_on_ticket_insert
  AFTER INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.create_chat_room_for_ticket();

-- Update existing chat rooms to link with tickets (if any exist)
-- This is optional and depends on existing data