
import { useEffect, useRef, useState } from "react";
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
  const [isTyping, setIsTyping] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Handle typing indicator
  useEffect(() => {
    if (newMessage.trim()) {
      setIsTyping(true);
      const timeout = setTimeout(() => setIsTyping(false), 1000);
      return () => clearTimeout(timeout);
    } else {
      setIsTyping(false);
    }
  }, [newMessage]);

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

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">
              {selectedChat.ticket?.title || 'Untitled Ticket'}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-gray-500">
                {userRole === 'customer' 
                  ? `Support Agent: ${selectedChat.agent?.name || 'Unassigned'}`
                  : `Customer: ${selectedChat.customer?.name || 'Unknown'}`
                }
              </p>
              {selectedChat.ticket?.category && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded text-xs">
                    {selectedChat.ticket.category}
                  </span>
                </>
              )}
            </div>
            {selectedChat.ticket?.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {selectedChat.ticket.description}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {selectedChat.ticket?.priority && (
              <Badge className={`${getPriorityColor(selectedChat.ticket.priority)} text-xs`} variant="secondary">
                {selectedChat.ticket.priority.toUpperCase()}
              </Badge>
            )}
            <Badge className={`${getStatusColor(selectedChat.status)} text-white`}>
              {getStatusText(selectedChat.status).toUpperCase()}
            </Badge>
            {selectedChat.status === 'active' && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600">Online</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.sender_id === currentUser?.id;
            
            return (
              <MessageBubble
                key={message.id}
                message={message}
                isOwnMessage={isOwnMessage}
              />
            );
          })
        )}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-200 rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message Input */}
      <div className="flex-shrink-0">
        <MessageInput
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          onSendMessage={onSendMessage}
        />
      </div>
    </div>
  );
};
