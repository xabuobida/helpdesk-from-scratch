import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Ticket } from "@/types/ticket";
import { SupabaseTicket } from "@/types/supabaseTicket";

export const useTicketFetching = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(false);

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

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  return {
    tickets,
    loading,
    ticketsLoading,
    fetchTickets,
  };
};