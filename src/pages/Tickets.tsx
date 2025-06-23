
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TicketList } from "@/components/TicketList";
import { TicketFilters } from "@/components/TicketFilters";
import { ActivityFeed } from "@/components/ActivityFeed";
import { CreateTicketModal } from "@/components/CreateTicketModal";
import { TicketDetailModal } from "@/components/TicketDetailModal";
import { mockTickets, mockActivities } from "@/data/mockData";
import { Ticket } from "@/types/ticket";
import { useData } from "@/contexts/DataContext";
import { Plus } from "lucide-react";

const Tickets = () => {
  const { customers } = useData();
  const [activeFilter, setActiveFilter] = useState("unassigned");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);

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

  const handleCreateTicket = (ticketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTicket: Ticket = {
      ...ticketData,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setTickets([newTicket, ...tickets]);
    setShowCreateModal(false);
  };

  const handleUpdateTicket = (updatedTicket: Ticket) => {
    setTickets(tickets.map(ticket => 
      ticket.id === updatedTicket.id ? updatedTicket : ticket
    ));
    setSelectedTicket(updatedTicket);
  };

  const getFilterCounts = () => {
    return {
      unassigned: tickets.filter(t => t.status === 'unassigned').length,
      assigned: tickets.filter(t => t.status === 'assigned').length,
      all: tickets.length,
      archive: tickets.filter(t => t.status === 'closed').length,
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <div className="flex-1 p-6">
          <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
              <Button 
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                New ticket
              </Button>
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

      <CreateTicketModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateTicket}
        customers={customers}
      />

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
