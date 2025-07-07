import { useTicketFetching } from "@/hooks/useTicketFetching";
import { useTicketOperations } from "@/hooks/useTicketOperations";
import { useProfiles } from "@/hooks/useProfiles";

export const useTicketManagement = () => {
  const { tickets, loading, ticketsLoading, fetchTickets } = useTicketFetching();
  const { profiles } = useProfiles();
  const { handleCreateTicket, handleUpdateTicket } = useTicketOperations(fetchTickets);

  return {
    tickets,
    profiles,
    loading,
    ticketsLoading,
    fetchTickets,
    handleCreateTicket: (ticketData: any) => handleCreateTicket(ticketData, profiles),
    handleUpdateTicket,
  };
};