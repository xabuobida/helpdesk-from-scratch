import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useActivities } from "@/hooks/useActivities";
import { Ticket } from "@/types/ticket";
import { SupabaseTicket } from "@/types/supabaseTicket";

export const useTicketManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addActivity } = useActivities();
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [profiles, setProfiles] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  // Fetch tickets based on user role
  const fetchTickets = async () => {
    if (!user) return;

    setTicketsLoading(true);
    try {
      let query = supabase
        .from('tickets')
        .select(`
          *,
          customer:profiles!tickets_customer_id_fkey(name, email),
          agent:profiles!tickets_assigned_to_fkey(name)
        `)
        .order('created_at', { ascending: false });

      // Filter tickets based on user role
      if (user.role === 'customer') {
        query = query.eq('customer_id', user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching tickets:', error);
        toast({
          title: "Error",
          description: "Failed to load tickets.",
          variant: "destructive",
        });
        return;
      }

      const formattedTickets: Ticket[] = (data as SupabaseTicket[]).map(ticket => ({
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status as any,
        priority: ticket.priority as any,
        category: ticket.category,
        customerName: ticket.customer.name,
        customerEmail: ticket.customer.email,
        assignedTo: ticket.agent?.name,
        createdAt: new Date(ticket.created_at),
        updatedAt: new Date(ticket.updated_at),
      }));

      setTickets(formattedTickets);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setTicketsLoading(false);
      setLoading(false);
    }
  };

  // Fetch profiles for customer selection (for admin/agent)
  const fetchProfiles = async () => {
    if (user?.role === 'customer') {
      return;
    }
    
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('role', 'customer');
    
    if (data) {
      setProfiles(data);
    }
  };

  // Get available support agents for auto-assignment
  const getAvailableAgent = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['agent', 'admin'])
      .limit(1);
    
    return data?.[0]?.id || null;
  };

  const handleCreateTicket = async (ticketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>) => {
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

      // Add activity for ticket creation
      if (newTicket) {
        await addActivity(`created ${ticketData.category} ticket #${newTicket.id}: ${ticketData.title}`);
      }

      toast({
        title: "Success",
        description: user?.role === 'customer' 
          ? "Ticket created successfully! Support team has been notified and will respond soon."
          : "Ticket created successfully.",
      });

      fetchTickets();
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

      // Add activity for ticket update
      await addActivity(`updated ticket #${updatedTicket.id}: status changed to ${updatedTicket.status}`);

      toast({
        title: "Success",
        description: "Ticket updated successfully.",
      });

      fetchTickets();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTickets();
      fetchProfiles();
    }
  }, [user]);

  return {
    tickets,
    profiles,
    loading,
    ticketsLoading,
    fetchTickets,
    handleCreateTicket,
    handleUpdateTicket,
  };
};