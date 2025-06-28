
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ChatList } from "@/components/chat/ChatList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useChat } from "@/hooks/useChat";

const Chat = () => {
  const { user } = useAuth();
  const {
    chatRooms,
    selectedChat,
    setSelectedChat,
    messages,
    loading,
    sendMessage,
    updateChatStatus
  } = useChat();
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !user) return;

    await sendMessage(selectedChat.id, newMessage);
    setNewMessage("");
  };

  const handleChatSelect = async (chat: any) => {
    setSelectedChat(chat);
    
    // If agent selects a waiting chat, mark it as active and assign themselves
    if (user?.role !== 'customer' && chat.status === 'waiting' && !chat.agent_id) {
      await updateChatStatus(chat.id, 'active', user.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

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
            messages={messages}
            userRole={user?.role || ''}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            onSendMessage={handleSendMessage}
            currentUser={user}
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
