import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { emailService } from '@/services/emailService';

export const useEmailNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || user.role === 'customer') return;

    console.log('Setting up email notifications for user:', user.id);

    // Subscribe to new tickets for email notifications
    const emailChannel = supabase
      .channel('email-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tickets'
        },
        async (payload) => {
          const newTicket = payload.new as any;
          
          try {
            // Get customer info
            const { data: customerData } = await supabase
              .from('profiles')
              .select('name, email')
              .eq('id', newTicket.customer_id)
              .single();

            const customerName = customerData?.name || 'Unknown Customer';
            
            // Send email notification
            await emailService.sendNewTicketNotification({
              ticketId: newTicket.id,
              title: newTicket.title,
              customerName,
              priority: newTicket.priority,
              description: newTicket.description
            });

            console.log('Email notification sent for new ticket:', newTicket.id);
          } catch (error) {
            console.error('Failed to send email notification:', error);
          }
        }
      )
      .subscribe();

    // Subscribe to ticket assignments for email notifications
    const assignmentChannel = supabase
      .channel('assignment-email-notifications')
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
          
          // Only send email if ticket was just assigned
          if (oldTicket.assigned_to !== updatedTicket.assigned_to && updatedTicket.assigned_to) {
            try {
              // Get customer and agent info
              const [customerData, agentData] = await Promise.all([
                supabase
                  .from('profiles')
                  .select('name')
                  .eq('id', updatedTicket.customer_id)
                  .single(),
                supabase
                  .from('profiles')
                  .select('email')
                  .eq('id', updatedTicket.assigned_to)
                  .single()
              ]);

              if (agentData.data?.email) {
                await emailService.sendTicketAssignedNotification({
                  ticketId: updatedTicket.id,
                  title: updatedTicket.title,
                  customerName: customerData.data?.name || 'Unknown Customer',
                  priority: updatedTicket.priority,
                  assignedTo: agentData.data.email
                });

                console.log('Assignment email notification sent for ticket:', updatedTicket.id);
              }
            } catch (error) {
              console.error('Failed to send assignment email notification:', error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up email notification subscriptions');
      supabase.removeChannel(emailChannel);
      supabase.removeChannel(assignmentChannel);
    };
  }, [user]);
};