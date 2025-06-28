
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChatRoom, Message } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useChat = () => {
  const { user } = useAuth();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch chat rooms
  const fetchChatRooms = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('chat_rooms')
        .select(`
          *,
          customer:profiles!customer_id(name, email),
          agent:profiles!agent_id(name, email)
        `)
        .order('updated_at', { ascending: false });

      if (user.role === 'customer') {
        query = query.eq('customer_id', user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching chat rooms:', error);
        toast({
          title: "Error",
          description: "Failed to load chat rooms",
          variant: "destructive"
        });
        return;
      }

      // Transform the data to match our ChatRoom interface
      const transformedData: ChatRoom[] = (data || []).map(room => ({
        id: room.id,
        customer_id: room.customer_id,
        agent_id: room.agent_id,
        status: room.status as 'active' | 'waiting' | 'closed',
        created_at: room.created_at,
        updated_at: room.updated_at,
        customer: room.customer,
        agent: room.agent
      }));

      setChatRooms(transformedData);
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for a specific chat room
  const fetchMessages = async (chatRoomId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:profiles!sender_id(name, role)
        `)
        .eq('chat_room_id', chatRoomId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Create or get existing chat room for customer
  const getOrCreateChatRoom = async () => {
    if (!user || user.role !== 'customer') return null;

    try {
      // Check if customer already has a chat room
      const { data: existingRoom, error: fetchError } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('customer_id', user.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking for existing chat room:', fetchError);
        return null;
      }

      if (existingRoom) {
        return existingRoom;
      }

      // Create new chat room
      const { data: newRoom, error: createError } = await supabase
        .from('chat_rooms')
        .insert({
          customer_id: user.id,
          status: 'waiting'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating chat room:', createError);
        toast({
          title: "Error",
          description: "Failed to create chat room",
          variant: "destructive"
        });
        return null;
      }

      return newRoom;
    } catch (error) {
      console.error('Error getting or creating chat room:', error);
      return null;
    }
  };

  // Send message
  const sendMessage = async (chatRoomId: string, message: string) => {
    if (!user || !message.trim()) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          chat_room_id: chatRoomId,
          sender_id: user.id,
          message: message.trim()
        });

      if (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive"
        });
        return;
      }

      // Update chat room's updated_at timestamp
      await supabase
        .from('chat_rooms')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatRoomId);

    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Update chat room status (for agents)
  const updateChatStatus = async (chatRoomId: string, status: 'active' | 'waiting' | 'closed', agentId?: string) => {
    if (!user || user.role === 'customer') return;

    try {
      const updateData: any = { status };
      if (agentId) {
        updateData.agent_id = agentId;
      }

      const { error } = await supabase
        .from('chat_rooms')
        .update(updateData)
        .eq('id', chatRoomId);

      if (error) {
        console.error('Error updating chat status:', error);
        toast({
          title: "Error",
          description: "Failed to update chat status",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating chat status:', error);
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to chat room changes
    const roomsChannel = supabase
      .channel('chat-rooms-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_rooms'
        },
        () => {
          fetchChatRooms();
        }
      )
      .subscribe();

    // Subscribe to message changes
    const messagesChannel = supabase
      .channel('chat-messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          const newMessage = payload.new as any;
          
          // If message is for the currently selected chat, add it to messages
          if (selectedChat && newMessage.chat_room_id === selectedChat.id) {
            fetchMessages(selectedChat.id);
          }
          
          // Refresh chat rooms to update last message
          fetchChatRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [user, selectedChat]);

  // Initial load
  useEffect(() => {
    if (user) {
      fetchChatRooms();
    }
  }, [user]);

  // Auto-create chat room for customers and auto-select it
  useEffect(() => {
    if (user?.role === 'customer' && chatRooms.length === 0 && !loading) {
      getOrCreateChatRoom().then((room) => {
        if (room) {
          fetchChatRooms();
        }
      });
    } else if (user?.role === 'customer' && chatRooms.length === 1 && !selectedChat) {
      // Auto-select the single chat room for customers
      setSelectedChat(chatRooms[0]);
    }
  }, [user, chatRooms.length, loading, selectedChat]);

  // Fetch messages when selected chat changes
  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
    }
  }, [selectedChat]);

  return {
    chatRooms,
    selectedChat,
    setSelectedChat,
    messages,
    loading,
    sendMessage,
    updateChatStatus,
    fetchChatRooms
  };
};
