
import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { ChatRoom } from "@/types/chat";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { getStatusColor, getStatusText } from "@/utils/chatUtils";

interface ChatWindowProps {
  selectedChat: ChatRoom;
  userRole: string;
  newMessage: string;
  setNewMessage: (message: string) => void;
  onSendMessage: () => void;
}

export const ChatWindow = ({ 
  selectedChat, 
  userRole, 
  newMessage, 
  setNewMessage, 
  onSendMessage 
}: ChatWindowProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChat.messages]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">
              {userRole === 'customer' 
                ? `Chat with ${selectedChat.agentName || 'Support Agent'}`
                : `Chat with ${selectedChat.customerName}`
              }
            </h3>
            <p className="text-sm text-gray-500">
              {userRole === 'customer' 
                ? `Customer ID: ${selectedChat.customerId}`
                : `Customer: ${selectedChat.customerName} • ID: ${selectedChat.customerId}`
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
        {selectedChat.messages.map((message) => {
          const isOwnMessage = userRole === 'customer' 
            ? message.isFromCustomer 
            : !message.isFromCustomer;
          
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
