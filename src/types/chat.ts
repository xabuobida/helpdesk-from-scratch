
export interface Message {
  id: string;
  sender: string;
  message: string;
  time: string;
  isFromCustomer: boolean;
  timestamp: Date;
}

export interface ChatRoom {
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
