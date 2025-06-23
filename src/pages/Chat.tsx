
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
  isCustomer: boolean;
  timestamp: Date;
}

interface ChatRoom {
  id: string;
  customerName: string;
  customerId: string;
  lastMessage: string;
  time: string;
  unread: number;
  status: 'open' | 'closed' | 'waiting';
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

  // Initialize chat rooms from customers
  useEffect(() => {
    const initialChatRooms: ChatRoom[] = customers.map((customer, index) => ({
      id: customer.id,
      customerName: customer.name,
      customerId: customer.id,
      lastMessage: index === 0 ? "I need help with my account access" : 
                   index === 1 ? "Billing question about my invoice" : 
                   "Order status inquiry",
      time: index === 0 ? "2m ago" : index === 1 ? "15m ago" : "1h ago",
      unread: index === 0 ? 2 : index === 1 ? 0 : 1,
      status: index === 0 ? 'open' : index === 1 ? 'waiting' : 'open',
      messages: [
        {
          id: `${customer.id}-1`,
          sender: customer.name,
          message: index === 0 ? "Hi, I'm having trouble accessing my account. It says 'Invalid credentials' even though I'm sure my password is correct." : 
                   index === 1 ? "Hello, I have a question about my latest invoice. Could you help me understand the charges?" :
                   "Hi there! I placed an order last week but haven't received any updates on the shipping status.",
          time: "10:30 AM",
          isCustomer: true,
          timestamp: new Date(Date.now() - (index + 1) * 60000)
        }
      ]
    }));

    setChatRooms(initialChatRooms);
    if (initialChatRooms.length > 0) {
      setSelectedChat(initialChatRooms[0]);
    }
  }, [customers]);

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
      isCustomer: false,
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

    // Simulate customer response after 2-3 seconds
    setTimeout(() => {
      const customerResponse: Message = {
        id: `${selectedChat.id}-${Date.now() + 1}`,
        sender: selectedChat.customerName,
        message: getRandomCustomerResponse(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isCustomer: true,
        timestamp: new Date()
      };

      const chatWithResponse = {
        ...updatedChat,
        messages: [...updatedChat.messages, customerResponse],
        lastMessage: customerResponse.message,
        time: "now",
        unread: updatedChat.unread + 1
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

  const getRandomCustomerResponse = (): string => {
    const responses = [
      "Thank you for the quick response!",
      "That helps, let me try that.",
      "I see, could you provide more details?",
      "Perfect, that solved my issue!",
      "I'm still having trouble, could you help further?",
      "Great! I'll follow those steps.",
      "Thanks for your patience with this."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
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
      case 'open': return 'bg-green-500';
      case 'waiting': return 'bg-yellow-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Chat List */}
        <div className="w-80 bg-white border-r border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Support Conversations ({filteredChatRooms.length})
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input 
                placeholder="Search conversations..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
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
                    <h3 className="font-medium text-gray-900">{room.customerName}</h3>
                    <Badge className={`${getStatusColor(room.status)} text-white text-xs`}>
                      {room.status}
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
        
        {/* Chat Window */}
        {selectedChat ? (
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedChat.customerName}</h3>
                  <p className="text-sm text-gray-500">
                    Customer ID: {selectedChat.customerId} • Status: {selectedChat.status}
                  </p>
                </div>
                <Badge className={`${getStatusColor(selectedChat.status)} text-white`}>
                  {selectedChat.status.toUpperCase()}
                </Badge>
              </div>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedChat.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isCustomer ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.isCustomer
                        ? "bg-gray-200 text-gray-900"
                        : "bg-indigo-600 text-white"
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-xs font-medium ${
                        message.isCustomer ? "text-gray-600" : "text-indigo-100"
                      }`}>
                        {message.sender}
                      </span>
                    </div>
                    <p className="text-sm">{message.message}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.isCustomer ? "text-gray-500" : "text-indigo-100"
                      }`}
                    >
                      {message.time}
                    </p>
                  </div>
                </div>
              ))}
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
              <h3 className="text-lg font-medium mb-2">No conversation selected</h3>
              <p>Choose a conversation from the list to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
