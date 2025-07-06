
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Archive, Ticket } from "lucide-react";
import { ChatRoom } from "@/types/chat";
import { useState } from "react";

interface ChatListProps {
  chatRooms: ChatRoom[];
  selectedChat: ChatRoom | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onChatSelect: (chat: ChatRoom) => void;
  userRole: string;
}

export const ChatList = ({ 
  chatRooms, 
  selectedChat, 
  searchQuery, 
  setSearchQuery, 
  onChatSelect, 
  userRole 
}: ChatListProps) => {
  const [showArchived, setShowArchived] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'waiting': return 'bg-yellow-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'waiting': return 'Waiting';
      case 'closed': return 'Closed';
      default: return 'Unknown';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter chat rooms based on archived state and search
  const filteredChatRooms = chatRooms.filter(room => {
    // Filter by archived state
    const isArchived = room.status === 'closed' || room.ticket?.status === 'closed';
    if (showArchived !== isArchived) return false;

    // Filter by search query
    if (!searchQuery) return true;
    
    const customerName = room.customer?.name?.toLowerCase() || '';
    const customerEmail = room.customer?.email?.toLowerCase() || '';
    const agentName = room.agent?.name?.toLowerCase() || '';
    const ticketTitle = room.ticket?.title?.toLowerCase() || '';
    const ticketCategory = room.ticket?.category?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    
    return customerName.includes(query) || 
           customerEmail.includes(query) || 
           agentName.includes(query) ||
           ticketTitle.includes(query) ||
           ticketCategory.includes(query);
  });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const openTicketsCount = chatRooms.filter(room => 
    room.status !== 'closed' && room.ticket?.status !== 'closed'
  ).length;

  const archivedTicketsCount = chatRooms.filter(room => 
    room.status === 'closed' || room.ticket?.status === 'closed'
  ).length;

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Ticket className="w-5 h-5" />
            {userRole === 'customer' ? 'My Tickets' : 'Support Tickets'}
          </h2>
          <span className="text-sm text-gray-500">
            ({showArchived ? archivedTicketsCount : openTicketsCount})
          </span>
        </div>
        
        {/* Archive Toggle */}
        <div className="flex gap-2 mb-3">
          <Button
            size="sm"
            variant={!showArchived ? "default" : "outline"}
            onClick={() => setShowArchived(false)}
            className="flex-1"
          >
            Open ({openTicketsCount})
          </Button>
          <Button
            size="sm"
            variant={showArchived ? "default" : "outline"}
            onClick={() => setShowArchived(true)}
            className="flex-1"
          >
            <Archive className="w-4 h-4 mr-1" />
            Archived ({archivedTicketsCount})
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input 
            placeholder="Search tickets..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div className="overflow-y-auto flex-1">
        {filteredChatRooms.map((room) => (
          <div
            key={room.id}
            onClick={() => onChatSelect(room)}
            className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
              selectedChat?.id === room.id ? "bg-indigo-50 border-indigo-200" : ""
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  {room.ticket?.title || 'Untitled Ticket'}
                </h3>
                <p className="text-sm text-gray-600 truncate">
                  {userRole === 'customer' 
                    ? (room.agent?.name || 'Support Agent') 
                    : (room.customer?.name || 'Customer')
                  }
                </p>
              </div>
              <span className="text-xs text-gray-500 flex-shrink-0">
                {formatTime(room.updated_at)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={`${getStatusColor(room.status)} text-white text-xs`}>
                  {getStatusText(room.status)}
                </Badge>
                {room.ticket?.priority && (
                  <Badge className={`${getPriorityColor(room.ticket.priority)} text-xs`} variant="secondary">
                    {room.ticket.priority.toUpperCase()}
                  </Badge>
                )}
              </div>
              {room.unreadCount && room.unreadCount > 0 && (
                <span className="bg-indigo-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                  {room.unreadCount}
                </span>
              )}
            </div>
            
            {room.ticket?.category && (
              <div className="mt-1">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {room.ticket.category}
                </span>
              </div>
            )}
          </div>
        ))}
        
        {filteredChatRooms.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            <Ticket className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="font-medium">
              {searchQuery ? 'No tickets match your search' : 
               showArchived ? 'No archived tickets found' : 'No open tickets found'}
            </p>
            <p className="text-sm mt-1">
              {!showArchived && userRole === 'customer' && 'Create a support ticket to get started'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
