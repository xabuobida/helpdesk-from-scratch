
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";

interface Message {
  id: string;
  sender: string;
  message: string;
  time: string;
  isFromCustomer: boolean;
  timestamp: Date;
}

interface ChatRoom {
  id: string;
  customerName: string;
  customerId: string;
  agentId?: string;
  agentName?: string;
  lastMessage: string;
  time: string;
  unread: number;
  status: 'active' | 'waiting' | 'closed';
  messages: Message[];
}

const Chat = () => {
  const { user } = useAuth();
  const { customers } = useData();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatRoom | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat rooms based on user role
  useEffect(() => {
    if (user?.role === 'customer') {
      // Customer sees only their own chat
      const customerChat: ChatRoom = {
        id: user.id,
        customerName: user.name,
        customerId: user.id,
        agentId: 'agent-1',
        agentName: 'Support Agent',
        lastMessage: "Hello! How can I help you today?",
        time: "now",
        unread: 0,
        status: 'active',
        messages: [
          {
            id: `${user.id}-welcome`,
            sender: 'Support Agent',
            message: "Hello! How can I help you today?",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isFromCustomer: false,
            timestamp: new Date()
          }
        ]
      };
      setChatRooms([customerChat]);
      setSelectedChat(customerChat);
    } else {
      // Admin/Agent sees all customer chats
      const adminChatRooms: ChatRoom[] = customers.map((customer, index) => ({
        id: customer.id,
        customerName: customer.name,
        customerId: customer.id,
        agentId: user?.id,
        agentName: user?.name,
        lastMessage: index === 0 ? "I need help with my account access" : 
                     index === 1 ? "Billing question about my invoice" : 
                     "Order status inquiry",
        time: index === 0 ? "2m ago" : index === 1 ? "15m ago" : "1h ago",
        unread: index === 0 ? 2 : index === 1 ? 0 : 1,
        status: index === 0 ? 'active' : index === 1 ? 'waiting' : 'active',
        messages: [
          {
            id: `${customer.id}-1`,
            sender: customer.name,
            message: index === 0 ? "Hi, I'm having trouble accessing my account. It says 'Invalid credentials' even though I'm sure my password is correct." : 
                     index === 1 ? "Hello, I have a question about my latest invoice. Could you help me understand the charges?" :
                     "Hi there! I placed an order last week but haven't received any updates on the shipping status.",
            time: "10:30 AM",
            isFromCustomer: true,
            timestamp: new Date(Date.now() - (index + 1) * 60000)
          }
        ]
      }));
      setChatRooms(adminChatRooms);
      if (adminChatRooms.length > 0) {
        setSelectedChat(adminChatRooms[0]);
      }
    }
  }, [customers, user]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [selectedChat?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChat || !user) return;

    const message: Message = {
      id: `${selectedChat.id}-${Date.now()}`,
      sender: user.name,
      message: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isFromCustomer: user.role === 'customer',
      timestamp: new Date()
    };

    // Update the selected chat with the new message
    const updatedChat = {
      ...selectedChat,
      messages: [...selectedChat.messages, message],
      lastMessage: newMessage,
      time: "now"
    };

    // Update chat rooms array
    const updatedChatRooms = chatRooms.map(room => 
      room.id === selectedChat.id ? updatedChat : room
    );

    setChatRooms(updatedChatRooms);
    setSelectedChat(updatedChat);
    setNewMessage("");

    // Simulate response from the other party after 2-3 seconds
    setTimeout(() => {
      const isCustomerSending = user.role === 'customer';
      const responseMessage: Message = {
        id: `${selectedChat.id}-${Date.now() + 1}`,
        sender: isCustomerSending ? (selectedChat.agentName || 'Support Agent') : selectedChat.customerName,
        message: getRandomResponse(isCustomerSending),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isFromCustomer: !isCustomerSending,
        timestamp: new Date()
      };

      const chatWithResponse = {
        ...updatedChat,
        messages: [...updatedChat.messages, responseMessage],
        lastMessage: responseMessage.message,
        time: "now",
        unread: user.role === 'customer' ? 0 : updatedChat.unread + 1
      };

      const finalChatRooms = updatedChatRooms.map(room => 
        room.id === selectedChat.id ? chatWithResponse : room
      );

      setChatRooms(finalChatRooms);
      if (selectedChat.id === chatWithResponse.id) {
        setSelectedChat(chatWithResponse);
      }
    }, Math.random() * 2000 + 1000);
  };

  const getRandomResponse = (isCustomerSending: boolean): string => {
    if (isCustomerSending) {
      // Agent responses
      const agentResponses = [
        "I understand your concern. Let me look into this for you.",
        "Thank you for providing that information. I'll help you resolve this issue.",
        "I can see what's happening here. Let me walk you through the solution.",
        "That's a great question. Here's what I recommend...",
        "I've checked your account and I can help you with this.",
        "Let me transfer you to our billing specialist for this inquiry.",
        "I've updated your account. Please try again and let me know if you need further assistance."
      ];
      return agentResponses[Math.floor(Math.random() * agentResponses.length)];
    } else {
      // Customer responses
      const customerResponses = [
        "Thank you for the quick response!",
        "That helps, let me try that.",
        "I see, could you provide more details?",
        "Perfect, that solved my issue!",
        "I'm still having trouble, could you help further?",
        "Great! I'll follow those steps.",
        "Thanks for your patience with this."
      ];
      return customerResponses[Math.floor(Math.random() * customerResponses.length)];
    }
  };

  const handleChatSelect = (chat: ChatRoom) => {
    setSelectedChat(chat);
    // Mark as read
    const updatedChat = { ...chat, unread: 0 };
    const updatedChatRooms = chatRooms.map(room => 
      room.id === chat.id ? updatedChat : room
    );
    setChatRooms(updatedChatRooms);
    setSelectedChat(updatedChat);
  };

  const filteredChatRooms = chatRooms.filter(room =>
    room.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Chat List - Only show for non-customers or if customer has multiple chats */}
        {(user?.role !== 'customer' || chatRooms.length > 1) && (
          <div className="w-80 bg-white border-r border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                {user?.role === 'customer' ? 'Support Chat' : `Support Conversations (${filteredChatRooms.length})`}
              </h2>
              {user?.role !== 'customer' && (
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
                  onClick={() => handleChatSelect(room)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    selectedChat?.id === room.id ? "bg-indigo-50 border-indigo-200" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900">
                        {user?.role === 'customer' ? (room.agentName || 'Support Agent') : room.customerName}
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
        )}
        
        {/* Chat Window */}
        {selectedChat ? (
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {user?.role === 'customer' 
                      ? `Chat with ${selectedChat.agentName || 'Support Agent'}`
                      : `Chat with ${selectedChat.customerName}`
                    }
                  </h3>
                  <p className="text-sm text-gray-500">
                    {user?.role === 'customer' 
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
                const isOwnMessage = user?.role === 'customer' 
                  ? message.isFromCustomer 
                  : !message.isFromCustomer;
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        isOwnMessage
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-200 text-gray-900"
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-xs font-medium ${
                          isOwnMessage ? "text-indigo-100" : "text-gray-600"
                        }`}>
                          {message.sender}
                        </span>
                      </div>
                      <p className="text-sm">{message.message}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isOwnMessage ? "text-indigo-100" : "text-gray-500"
                        }`}
                      >
                        {message.time}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex space-x-3">
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendMessage} 
                  className="bg-indigo-600 hover:bg-indigo-700"
                  disabled={!newMessage.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <h3 className="text-lg font-medium mb-2">
                {user?.role === 'customer' ? 'Loading chat...' : 'No conversation selected'}
              </h3>
              <p>
                {user?.role === 'customer' 
                  ? 'Please wait while we connect you with support'
                  : 'Choose a conversation from the list to start chatting'
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
