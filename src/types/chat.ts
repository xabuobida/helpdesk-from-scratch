
export interface Message {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
  chat_room_id: string;
  ticket_id?: string;
  sender?: {
    name: string;
    role: string;
  };
}

export interface ChatRoom {
  id: string;
  customer_id: string;
  agent_id?: string;
  ticket_id?: string;
  status: 'active' | 'waiting' | 'closed';
  created_at: string;
  updated_at: string;
  customer?: {
    name: string;
    email: string;
  };
  agent?: {
    name: string;
    email: string;
  };
  ticket?: {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    category: string;
  };
  messages?: Message[];
  lastMessage?: string;
  unreadCount?: number;
}
