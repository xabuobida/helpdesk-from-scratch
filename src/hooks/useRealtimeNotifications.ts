
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from './useNotifications';

export const useRealtimeNotifications = () => {
  const { user } = useAuth();
  const { showNotification } = useNotifications();
  const subscriptionsRef = useRef<any[]>([]);

  useEffect(() => {
    if (!user) return;

    console.log('Setting up real-time notifications for user:', user.id);

    // Clean up existing subscriptions
    subscriptionsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    subscriptionsRef.current = [];

    // Subscribe to new messages in chat for customers
    if (user.role === 'customer') {
      const chatMessagesChannel = supabase
        .channel(`chat-messages-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages'
          },
          async (payload) => {
            const newMessage = payload.new as any;
            
            // Only show notifications for messages from others
            if (newMessage.sender_id !== user.id) {
              // Check if this message is in user's chat room
              const { data: chatRoom } = await supabase
                .from('chat_rooms')
                .select('customer_id')
                .eq('id', newMessage.chat_room_id)
                .eq('customer_id', user.id)
                .single();

              if (chatRoom) {
                // Get sender info
                const { data: senderData } = await supabase
                  .from('profiles')
                  .select('name')
                  .eq('id', newMessage.sender_id)
                  .single();

                const senderName = senderData?.name || 'Support Agent';
                
                showNotification('New Chat Message', {
                  body: `${senderName}: ${newMessage.message}`,
                  tag: 'chat-message',
                  icon: '/favicon.ico'
                });
              }
            }
          }
        )
        .subscribe();

      // Subscribe to ticket updates for customers
      const ticketUpdatesChannel = supabase
        .channel(`ticket-updates-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tickets'
          },
          async (payload) => {
            const updatedTicket = payload.new as any;
            const oldTicket = payload.old as any;
            
            // Only notify about tickets belonging to this customer
            if (updatedTicket.customer_id === user.id) {
              // Notify about status changes
              if (oldTicket.status !== updatedTicket.status) {
                let message = '';
                switch (updatedTicket.status) {
                  case 'assigned':
                    message = 'Your ticket has been assigned to an agent';
                    break;
                  case 'in_progress':
                    message = 'Work has started on your ticket';
                    break;
                  case 'resolved':
                    message = 'Your ticket has been resolved';
                    break;
                  case 'closed':
                    message = 'Your ticket has been closed';
                    break;
                }
                
                if (message) {
                  showNotification('Ticket Update', {
                    body: `${message}: ${updatedTicket.title}`,
                    tag: 'ticket-update',
                    icon: '/favicon.ico'
                  });
                }
              }
            }
          }
        )
        .subscribe();

      // Subscribe to new messages on customer's tickets
      const ticketMessagesChannel = supabase
        .channel(`ticket-messages-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
          },
          async (payload) => {
            const newMessage = payload.new as any;
            
            // Don't notify about own messages
            if (newMessage.sender_id === user.id) return;

            // Check if this message is on user's ticket
            const { data: ticketData } = await supabase
              .from('tickets')
              .select('title, customer_id')
              .eq('id', newMessage.ticket_id)
              .eq('customer_id', user.id)
              .single();

            if (ticketData) {
              const { data: senderData } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', newMessage.sender_id)
                .single();

              const senderName = senderData?.name || 'Support Agent';
              
              showNotification('New Message on Ticket', {
                body: `${senderName} replied to: ${ticketData.title}`,
                tag: 'ticket-message',
                icon: '/favicon.ico'
              });
            }
          }
        )
        .subscribe();

      subscriptionsRef.current = [chatMessagesChannel, ticketUpdatesChannel, ticketMessagesChannel];
    }

    // Subscribe to chat room status changes for customers
    if (user.role === 'customer') {
      const roomsChannel = supabase
        .channel(`chat-rooms-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_rooms'
          },
          (payload) => {
            const updatedRoom = payload.new as any;
            
            // Notify customer when agent joins
            if (updatedRoom.customer_id === user.id && 
                updatedRoom.status === 'active' && 
                updatedRoom.agent_id) {
              showNotification('Support Agent Connected', {
                body: 'A support agent has joined your chat',
                tag: 'agent-joined',
                icon: '/favicon.ico'
              });
            }
          }
        )
        .subscribe();

      subscriptionsRef.current.push(roomsChannel);
    }

    return () => {
      console.log('Cleaning up notification subscriptions');
      subscriptionsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      subscriptionsRef.current = [];
    };
  }, [user?.id, user?.role, showNotification]);
};
