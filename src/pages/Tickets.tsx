
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TicketList } from "@/components/TicketList";
import { TicketFilters } from "@/components/TicketFilters";
import { ActivityFeed } from "@/components/ActivityFeed";
import { CreateTicketModal } from "@/components/CreateTicketModal";
import { TicketDetailModal } from "@/components/TicketDetailModal";
import { mockActivities } from "@/data/mockData";
import { Ticket } from "@/types/ticket";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SupabaseTicket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  customer_id: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  customer: {
    name: string;
    email: string;
  };
  agent?: {
    name: string;
  };
}

const Tickets = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState("unassigned");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [profiles, setProfiles] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Fetch tickets based on user role
  const fetchTickets = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('tickets')
        .select(`
          *,
          customer:profiles!tickets_customer_id_fkey(name, email),
          agent:profiles!tickets_assigned_to_fkey(name)
        `)
        .order('created_at', { ascending: false });

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
      setLoading(false);
    }
  };

  // Fetch profiles for customer selection
  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('role', 'customer');
    
    if (data) {
      setProfiles(data);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchProfiles();
  }, [user]);

  const filteredTickets = tickets.filter((ticket) => {
    const matchesFilter = activeFilter === "all" || ticket.status === activeFilter;
    const matchesSearch = 
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
  };

  const handleCreateTicket = async (ticketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Find customer profile by email
      const customer = profiles.find(p => p.email === ticketData.customerEmail);
      if (!customer) {
        toast({
          title: "Error",
          description: "Customer not found.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('tickets')
        .insert({
          title: ticketData.title,
          description: ticketData.description,
          status: ticketData.status,
          priority: ticketData.priority,
          category: ticketData.category,
          customer_id: customer.id,
          assigned_to: null // Will be set when assigning
        });

      if (error) {
        console.error('Error creating ticket:', error);
        toast({
          title: "Error",
          description: "Failed to create ticket.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Ticket created successfully.",
      });

      setShowCreateModal(false);
      fetchTickets(); // Refresh tickets
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

      toast({
        title: "Success",
        description: "Ticket updated successfully.",
      });

      setSelectedTicket(updatedTicket);
      fetchTickets(); // Refresh tickets
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getFilterCounts = () => {
    return {
      unassigned: tickets.filter(t => t.status === 'unassigned').length,
      assigned: tickets.filter(t => t.status === 'assigned').length,
      all: tickets.length,
      archive: tickets.filter(t => t.status === 'closed').length,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <div className="flex-1 p-6">
          <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {user?.role === 'customer' ? 'My Tickets' : 'Tickets'}
              </h1>
              {(user?.role === 'admin' || user?.role === 'agent') && (
                <Button 
                  className="bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New ticket
                </Button>
              )}
            </div>
            
            <TicketFilters
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filterCounts={getFilterCounts()}
            />
            
            <div className="mt-6">
              <TicketList 
                tickets={filteredTickets}
                onTicketClick={handleTicketClick}
              />
            </div>
          </div>
        </div>
        
        <div className="w-80 p-6">
          <ActivityFeed activities={mockActivities} />
        </div>
      </div>

      {(user?.role === 'admin' || user?.role === 'agent') && (
        <CreateTicketModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTicket}
          customers={profiles}
        />
      )}

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onUpdate={handleUpdateTicket}
        />
      )}
    </div>
  );
};

export default Tickets;
