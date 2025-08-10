
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/FirebaseAuthContext';
import { useNotifications } from './useNotifications';

export const useRealtimeNotifications = () => {
  const { user } = useAuth();
  const { showNotification } = useNotifications();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!user) {
      // Clean up when user logs out
      if (channelRef.current) {
        console.log('Cleaning up notification subscriptions - user logged out');
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    // Prevent duplicate subscriptions
    if (channelRef.current) {
      console.log('Real-time notifications already set up for user:', user.id);
      return;
    }

    console.log('Setting up real-time notifications for user:', user.id);

    // Create a unique channel for this user's notifications
    const channel = supabase.channel(`user-notifications-${user.id}-${Date.now()}`);

    // Subscribe to chat messages for customers
    if (user.role === 'customer') {
      channel.on(
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
      );

      // Subscribe to ticket updates for customers
      channel.on(
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
      );

      // Subscribe to chat room status changes
      channel.on(
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
      );
    }

    // Subscribe to new tickets for agents and admins
    if (user.role === 'agent' || user.role === 'admin') {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tickets'
        },
        async (payload) => {
          const newTicket = payload.new as any;
          
          // Get customer info
          const { data: customerData } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', newTicket.customer_id)
            .single();

          const customerName = customerData?.name || 'Unknown Customer';
          
          // Show desktop notification
          showNotification('New Support Ticket', {
            body: `${customerName} created a new ${newTicket.priority} priority ticket: ${newTicket.title}`,
            tag: 'new-ticket',
            icon: '/favicon.ico',
            requireInteraction: true
          });
        }
      );

      // Subscribe to ticket assignment notifications
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets'
        },
        async (payload) => {
          const updatedTicket = payload.new as any;
          const oldTicket = payload.old as any;
          
          // Only notify if status changed to assigned and user is the assignee
          if (oldTicket.status !== 'assigned' && 
              updatedTicket.status === 'assigned' && 
              updatedTicket.assigned_to === user.id) {
            
            showNotification('Ticket Assigned', {
              body: `You have been assigned ticket: ${updatedTicket.title}`,
              tag: 'ticket-assigned',
              icon: '/favicon.ico'
            });
          }
        }
      );
    }

    // Subscribe for the channel
    channel.subscribe();
    channelRef.current = channel;

    return () => {
      console.log('Cleaning up notification subscriptions');
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, user?.role, showNotification]);
};
