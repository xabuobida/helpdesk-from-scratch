
import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { ChatRoom, Message } from "@/types/chat";

interface ChatWindowProps {
  selectedChat: ChatRoom;
  messages: Message[];
  userRole: string;
  newMessage: string;
  setNewMessage: (message: string) => void;
  onSendMessage: () => void;
  currentUser: any;
}

export const ChatWindow = ({ 
  selectedChat, 
  messages,
  userRole, 
  newMessage, 
  setNewMessage, 
  onSendMessage,
  currentUser
}: ChatWindowProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">
              {userRole === 'customer' 
                ? `Chat with ${selectedChat.agent?.name || 'Support Agent'}`
                : `Chat with ${selectedChat.customer?.name || 'Customer'}`
              }
            </h3>
            <p className="text-sm text-gray-500">
              {userRole === 'customer' 
                ? `Customer ID: ${selectedChat.customer_id}`
                : `Customer: ${selectedChat.customer?.name} • ID: ${selectedChat.customer_id}`
              } • Status: {getStatusText(selectedChat.status)}
            </p>
          </div>
          <Badge className={`${getStatusColor(selectedChat.status)} text-white`}>
            {getStatusText(selectedChat.status).toUpperCase()}
          </Badge>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isOwnMessage = message.sender_id === currentUser?.id;
          
          return (
            <MessageBubble
              key={message.id}
              message={message}
              isOwnMessage={isOwnMessage}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message Input */}
      <MessageInput
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        onSendMessage={onSendMessage}
      />
    </div>
  );
};
