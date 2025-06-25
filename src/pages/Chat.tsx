
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { ChatRoom, Message } from "@/types/chat";
import { ChatList } from "@/components/chat/ChatList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { getRandomResponse } from "@/utils/chatUtils";

const Chat = () => {
  const { user } = useAuth();
  const { customers } = useData();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatRoom | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Chat List - Only show for non-customers or if customer has multiple chats */}
        {(user?.role !== 'customer' || chatRooms.length > 1) && (
          <ChatList
            chatRooms={chatRooms}
            selectedChat={selectedChat}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onChatSelect={handleChatSelect}
            userRole={user?.role || ''}
          />
        )}
        
        {/* Chat Window */}
        {selectedChat ? (
          <ChatWindow
            selectedChat={selectedChat}
            userRole={user?.role || ''}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            onSendMessage={handleSendMessage}
          />
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
