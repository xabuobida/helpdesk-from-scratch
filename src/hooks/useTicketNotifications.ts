
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from './useNotifications';

export const useTicketNotifications = () => {
  const { user } = useAuth();
  const { showNotification } = useNotifications();

  useEffect(() => {
    if (!user || user.role === 'customer') return;

    console.log('Setting up ticket notifications for user:', user.id);

    // Subscribe to new tickets for agents and admins
    const ticketsChannel = supabase
      .channel('ticket-notifications')
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

          // Send email notification (this would typically be handled by a backend service)
          console.log('Email notification would be sent for new ticket:', {
            ticketId: newTicket.id,
            title: newTicket.title,
            customer: customerName,
            priority: newTicket.priority
          });
        }
      )
      .subscribe();

    // Subscribe to ticket status changes
    const statusChannel = supabase
      .channel('ticket-status-notifications')
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

    return () => {
      console.log('Cleaning up ticket notification subscriptions');
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(statusChannel);
    };
  }, [user, showNotification]);
};
