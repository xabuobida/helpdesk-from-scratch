import { useAuth } from "@/contexts/FirebaseAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useActivities } from "@/hooks/useActivities";
import { Ticket } from "@/types/ticket";

export const useTicketOperations = (onTicketChange: () => void) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addActivity } = useActivities();

  const getAvailableAgent = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['agent', 'admin'])
      .limit(1);
    
    return data?.[0]?.id || null;
  };

  const handleCreateTicket = async (
    ticketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>,
    profiles: Array<{ id: string; name: string; email: string }>
  ) => {
    try {
      let customerId = user?.id;
      let assignedAgentId = null;

      if (user?.role === 'customer') {
        assignedAgentId = await getAvailableAgent();
      } else {
        const customer = profiles.find(p => p.email === ticketData.customerEmail);
        if (!customer) {
          toast({
            title: "Error",
            description: "Customer not found.",
            variant: "destructive",
          });
          return;
        }
        customerId = customer.id;
      }

      const { data: newTicket, error } = await supabase
        .from('tickets')
        .insert({
          title: ticketData.title,
          description: ticketData.description,
          status: assignedAgentId ? 'assigned' : 'unassigned',
          priority: ticketData.priority,
          category: ticketData.category,
          customer_id: customerId,
          assigned_to: assignedAgentId
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating ticket:', error);
        toast({
          title: "Error",
          description: "Failed to create ticket.",
          variant: "destructive",
        });
        return;
      }

      if (newTicket) {
        await addActivity(`created ${ticketData.category} ticket #${newTicket.id}: ${ticketData.title}`);
      }

      toast({
        title: "Success",
        description: user?.role === 'customer' 
          ? "Ticket created successfully! Support team has been notified and will respond soon."
          : "Ticket created successfully.",
      });

      onTicketChange();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleUpdateTicket = async (updatedTicket: Ticket) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          title: updatedTicket.title,
          description: updatedTicket.description,
          status: updatedTicket.status,
          priority: updatedTicket.priority,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedTicket.id);

      if (error) {
        console.error('Error updating ticket:', error);
        toast({
          title: "Error",
          description: "Failed to update ticket.",
          variant: "destructive",
        });
        return;
      }

      await addActivity(`updated ticket #${updatedTicket.id}: status changed to ${updatedTicket.status}`);

      toast({
        title: "Success",
        description: "Ticket updated successfully.",
      });

      onTicketChange();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return {
    handleCreateTicket,
    handleUpdateTicket,
  };
};