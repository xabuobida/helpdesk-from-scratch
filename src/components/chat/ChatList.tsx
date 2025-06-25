
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { ChatRoom } from "@/types/chat";
import { getStatusColor, getStatusText } from "@/utils/chatUtils";

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
  const filteredChatRooms = chatRooms.filter(room =>
    room.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 bg-white border-r border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {userRole === 'customer' ? 'Support Chat' : `Support Conversations (${filteredChatRooms.length})`}
        </h2>
        {userRole !== 'customer' && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input 
              placeholder="Search conversations..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </div>
      
      <div className="overflow-y-auto">
        {filteredChatRooms.map((room) => (
          <div
            key={room.id}
            onClick={() => onChatSelect(room)}
            className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
              selectedChat?.id === room.id ? "bg-indigo-50 border-indigo-200" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-medium text-gray-900">
                  {userRole === 'customer' ? (room.agentName || 'Support Agent') : room.customerName}
                </h3>
                <Badge className={`${getStatusColor(room.status)} text-white text-xs`}>
                  {getStatusText(room.status)}
                </Badge>
              </div>
              <span className="text-xs text-gray-500">{room.time}</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 truncate max-w-[200px]">{room.lastMessage}</p>
              {room.unread > 0 && (
                <span className="bg-indigo-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                  {room.unread}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
