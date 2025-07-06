import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TicketList } from "@/components/TicketList";
import { TicketFilters } from "@/components/TicketFilters";
import { ActivityFeed } from "@/components/ActivityFeed";
import { CreateTicketModal } from "@/components/CreateTicketModal";
import { TicketDetailModal } from "@/components/TicketDetailModal";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivities } from "@/hooks/useActivities";
import { useTicketManagement } from "@/hooks/useTicketManagement";
import { useTicketFiltering } from "@/hooks/useTicketFiltering";
import { Ticket } from "@/types/ticket";
import { useAuth } from "@/contexts/AuthContext";
import { Plus } from "lucide-react";
import { useTicketNotifications } from "@/hooks/useTicketNotifications";
import { useEmailNotifications } from "@/hooks/useEmailNotifications";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

const Tickets = () => {
  const { user } = useAuth();
  const { activities, loading: activitiesLoading } = useActivities();
  
  // Set up notification hooks
  useTicketNotifications();
  useEmailNotifications();
  useRealtimeNotifications();
  
  const [activeFilter, setActiveFilter] = useState("unassigned");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Use custom hooks for ticket management and filtering
  const {
    tickets,
    profiles,
    loading,
    ticketsLoading,
    handleCreateTicket,
    handleUpdateTicket,
  } = useTicketManagement();

  const { filteredTickets, getFilterCounts } = useTicketFiltering({
    tickets,
    activeFilter,
    searchQuery,
  });

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
  };

  const onCreateTicket = async (ticketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>) => {
    await handleCreateTicket(ticketData);
    setShowCreateModal(false);
  };

  const onUpdateTicket = async (updatedTicket: Ticket) => {
    await handleUpdateTicket(updatedTicket);
    setSelectedTicket(updatedTicket);
  };

  // Show skeleton loading only on initial load
  if (loading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-12 w-full mb-4" />
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
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
              <Button 
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                {user?.role === 'customer' ? 'Create ticket' : 'New ticket'}
              </Button>
            </div>
            
            <TicketFilters
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filterCounts={getFilterCounts}
            />
            
            <div className="mt-6">
              {ticketsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : (
                <TicketList 
                  tickets={filteredTickets}
                  onTicketClick={handleTicketClick}
                />
              )}
            </div>
          </div>
        </div>
        
        <div className="w-80 p-6">
          <ActivityFeed 
            activities={activities} 
            loading={activitiesLoading}
          />
        </div>
      </div>

      <CreateTicketModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={onCreateTicket}
        customers={profiles}
      />

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onUpdate={onUpdateTicket}
        />
      )}
    </div>
  );
};

export default Tickets;
