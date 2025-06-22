
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Search } from "lucide-react";

const chatRooms = [
  { id: 1, name: "John Doe", lastMessage: "Thanks for your help!", time: "2m ago", unread: 2 },
  { id: 2, name: "Jane Smith", lastMessage: "I need help with billing", time: "15m ago", unread: 0 },
  { id: 3, name: "Bob Wilson", lastMessage: "Order confirmation needed", time: "1h ago", unread: 1 },
];

const messages = [
  { id: 1, sender: "John Doe", message: "Hi, I'm having trouble accessing my account", time: "10:30 AM", isCustomer: true },
  { id: 2, sender: "You", message: "Hello John! I'd be happy to help you with that. Can you tell me what error you're seeing?", time: "10:32 AM", isCustomer: false },
  { id: 3, sender: "John Doe", message: "It says 'Invalid credentials' even though I'm sure my password is correct", time: "10:33 AM", isCustomer: true },
  { id: 4, sender: "You", message: "Let me check that for you. Can you confirm your email address?", time: "10:35 AM", isCustomer: false },
];

const Chat = () => {
  const [selectedChat, setSelectedChat] = useState(chatRooms[0]);
  const [newMessage, setNewMessage] = useState("");

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      console.log("Sending message:", newMessage);
      setNewMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Chat List */}
        <div className="w-80 bg-white border-r border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Conversations</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input placeholder="Search conversations..." className="pl-10" />
            </div>
          </div>
          
          <div className="overflow-y-auto">
            {chatRooms.map((room) => (
              <div
                key={room.id}
                onClick={() => setSelectedChat(room)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedChat.id === room.id ? "bg-indigo-50 border-indigo-200" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-gray-900">{room.name}</h3>
                  <span className="text-xs text-gray-500">{room.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 truncate">{room.lastMessage}</p>
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
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="bg-white border-b border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900">{selectedChat.name}</h3>
            <p className="text-sm text-gray-500">Online</p>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
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
              <Button onClick={handleSendMessage} className="bg-indigo-600 hover:bg-indigo-700">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
