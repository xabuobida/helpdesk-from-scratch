export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'agent' | 'customer';
  createdAt: Date;
  updatedAt: Date;
  ticketsCount?: number;
  lastActive?: Date;
  avatarUrl?: string;
  phone?: string;
  company?: string;
  status?: string;
  notes?: string;
}

export interface FirebaseTicket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  customerId: string;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  customerInfo?: {
    name: string;
    email: string;
  };
  agentInfo?: {
    name: string;
  };
}

export interface FirebaseMessage {
  id: string;
  ticketId: string;
  senderId: string;
  message: string;
  createdAt: Date;
  senderInfo?: {
    name: string;
    role: string;
  };
}

export interface FirebaseChatRoom {
  id: string;
  customerId: string;
  agentId?: string;
  ticketId?: string;
  status: 'active' | 'waiting' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  customerInfo?: {
    name: string;
    email: string;
  };
  agentInfo?: {
    name: string;
    email: string;
  };
}

export interface FirebaseChatMessage {
  id: string;
  chatRoomId: string;
  senderId: string;
  message: string;
  createdAt: Date;
  ticketId?: string;
  senderInfo?: {
    name: string;
    role: string;
  };
}

export interface ActivityItem {
  id: string;
  userId: string;
  message: string;
  type: 'ticket_created' | 'ticket_updated' | 'ticket_assigned' | 'message_sent' | 'other';
  createdAt: Date;
  userInfo?: {
    name: string;
  };
}