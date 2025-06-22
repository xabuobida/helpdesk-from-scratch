
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TicketList } from "@/components/TicketList";
import { TicketFilters } from "@/components/TicketFilters";
import { ActivityFeed } from "@/components/ActivityFeed";
import { mockTickets, mockActivities } from "@/data/mockData";
import { Ticket } from "@/types/ticket";
import { Plus } from "lucide-react";

const Tickets = () => {
  const [activeFilter, setActiveFilter] = useState("unassigned");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTickets = mockTickets.filter((ticket) => {
    const matchesFilter = activeFilter === "all" || ticket.status === activeFilter;
    const matchesSearch = 
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const handleTicketClick = (ticket: Ticket) => {
    console.log("Clicked ticket:", ticket);
    // Here you would typically navigate to ticket detail view
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <div className="flex-1 p-6">
          <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                New ticket
              </Button>
            </div>
            
            <TicketFilters
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
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
    </div>
  );
};

export default Tickets;
