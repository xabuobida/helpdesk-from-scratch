
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from './useNotifications';

export const useTicketNotifications = () => {
  const { user } = useAuth();
  const { showNotification } = useNotifications();
  const subscriptionsRef = useRef<any[]>([]);

  useEffect(() => {
    if (!user || user.role === 'customer') return;

    console.log('Setting up ticket notifications for user:', user.id);

    // Clean up existing subscriptions
    subscriptionsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    subscriptionsRef.current = [];

    // Subscribe to new tickets for agents and admins
    const ticketsChannel = supabase
      .channel(`ticket-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tickets'
        },
        async (payload) => {
          const newTicket = payload.new as any;
          
          console.log('New ticket created:', newTicket);

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
      )
      .subscribe();

    // Subscribe to ticket status changes
    const statusChannel = supabase
      .channel(`ticket-status-notifications-${user.id}`)
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
      )
      .subscribe();

    // Subscribe to new messages for staff
    const messagesChannel = supabase
      .channel(`message-notifications-${user.id}`)
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

          // Get ticket and sender info
          const { data: ticketData } = await supabase
            .from('tickets')
            .select('title, customer_id, assigned_to')
            .eq('id', newMessage.ticket_id)
            .single();

          // Only notify if user is assigned to ticket or is admin/agent
          if (ticketData && (ticketData.assigned_to === user.id || user.role === 'admin')) {
            const { data: senderData } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', newMessage.sender_id)
              .single();

            const senderName = senderData?.name || 'Someone';
            
            showNotification('New Message', {
              body: `${senderName} sent a message on ticket: ${ticketData.title}`,
              tag: 'ticket-message',
              icon: '/favicon.ico'
            });
          }
        }
      )
      .subscribe();

    subscriptionsRef.current = [ticketsChannel, statusChannel, messagesChannel];

    return () => {
      console.log('Cleaning up ticket notification subscriptions');
      subscriptionsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      subscriptionsRef.current = [];
    };
  }, [user?.id, user?.role, showNotification]);
};
