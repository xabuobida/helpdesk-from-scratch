import { useMemo } from "react";
import { Ticket } from "@/types/ticket";
import { useAuth } from "@/contexts/FirebaseAuthContext";

interface UseTicketFilteringProps {
  tickets: Ticket[];
  activeFilter: string;
  searchQuery: string;
}

export const useTicketFiltering = ({ tickets, activeFilter, searchQuery }: UseTicketFilteringProps) => {
  const { user } = useAuth();

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      let matchesFilter = false;
      
      switch (activeFilter) {
        case "all":
          matchesFilter = true;
          break;
        case "unassigned":
          matchesFilter = ticket.status === "unassigned";
          break;
        case "assigned":
          matchesFilter = ticket.status === "assigned" && ticket.assignedTo === user?.name;
          break;
        case "in_progress":
          matchesFilter = ticket.status === "in_progress";
          break;
        case "resolved":
          matchesFilter = ticket.status === "resolved";
          break;
        case "closed":
          matchesFilter = ticket.status === "closed";
          break;
        default:
          matchesFilter = ticket.status === activeFilter;
      }
      
      const matchesSearch = 
        ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.customerName.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesFilter && matchesSearch;
    });
  }, [tickets, activeFilter, searchQuery, user?.name]);

  const getFilterCounts = useMemo(() => {
    return {
      unassigned: tickets.filter(t => t.status === 'unassigned').length,
      assigned: tickets.filter(t => t.status === 'assigned' && t.assignedTo === user?.name).length,
      in_progress: tickets.filter(t => t.status === 'in_progress').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
      all: tickets.length,
      archive: tickets.filter(t => t.status === 'closed').length,
    };
  }, [tickets, user?.name]);

  return {
    filteredTickets,
    getFilterCounts,
  };
};