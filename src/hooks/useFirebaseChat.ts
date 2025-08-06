import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/FirebaseAuthContext';
import { FirebaseChatRoom, FirebaseChatMessage } from '@/types/firebase';
import { ChatRoom, Message } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';

export const useFirebaseChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch chat rooms
  useEffect(() => {
    if (!user) {
      setChatRooms([]);
      setLoading(false);
      return;
    }

    let q;
    if (user.role === 'customer') {
      q = query(
        collection(db, 'chatRooms'),
        where('customerId', '==', user.id),
        orderBy('updatedAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'chatRooms'),
        orderBy('updatedAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const roomPromises = snapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();
        
        // Get customer info
        let customerInfo = undefined;
        if (data.customerId) {
          const customerDoc = await getDoc(doc(db, 'users', data.customerId));
          if (customerDoc.exists()) {
            const customerData = customerDoc.data();
            customerInfo = {
              name: customerData.name || '',
              email: customerData.email || ''
            };
          }
        }

        // Get agent info
        let agentInfo = undefined;
        if (data.agentId) {
          const agentDoc = await getDoc(doc(db, 'users', data.agentId));
          if (agentDoc.exists()) {
            const agentData = agentDoc.data();
            agentInfo = {
              name: agentData.name || '',
              email: agentData.email || ''
            };
          }
        }

        // Get ticket info
        let ticketInfo = undefined;
        if (data.ticketId) {
          const ticketDoc = await getDoc(doc(db, 'tickets', data.ticketId));
          if (ticketDoc.exists()) {
            const ticketData = ticketDoc.data();
            ticketInfo = {
              id: ticketDoc.id,
              title: ticketData.title || '',
              description: ticketData.description || '',
              status: ticketData.status || '',
              priority: ticketData.priority || '',
              category: ticketData.category || ''
            };
          }
        }

        return {
          id: docSnapshot.id,
          customer_id: data.customerId,
          agent_id: data.agentId,
          ticket_id: data.ticketId,
          status: data.status,
          created_at: data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
          updated_at: data.updatedAt?.toDate()?.toISOString() || new Date().toISOString(),
          customer: customerInfo,
          agent: agentInfo,
          ticket: ticketInfo
        } as ChatRoom;
      });

      const resolvedRooms = await Promise.all(roomPromises);
      setChatRooms(resolvedRooms);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch messages for active room
  useEffect(() => {
    if (!activeRoom) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'chatMessages'),
      where('chatRoomId', '==', activeRoom.id),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const messagePromises = snapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();
        
        // Get sender info
        let senderInfo = undefined;
        if (data.senderId) {
          const senderDoc = await getDoc(doc(db, 'users', data.senderId));
          if (senderDoc.exists()) {
            const senderData = senderDoc.data();
            senderInfo = {
              name: senderData.name || '',
              role: senderData.role || ''
            };
          }
        }

        return {
          id: docSnapshot.id,
          sender_id: data.senderId,
          message: data.message,
          created_at: data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
          chat_room_id: data.chatRoomId,
          ticket_id: data.ticketId,
          sender: senderInfo
        } as Message;
      });

      const resolvedMessages = await Promise.all(messagePromises);
      setMessages(resolvedMessages);
    });

    return () => unsubscribe();
  }, [activeRoom]);

  const createChatRoom = async (customerId?: string, ticketId?: string) => {
    if (!user) return;

    try {
      const roomData: any = {
        customerId: customerId || user.id,
        status: 'waiting',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (user.role !== 'customer') {
        roomData.agentId = user.id;
        roomData.status = 'active';
      }

      if (ticketId) {
        roomData.ticketId = ticketId;
      }

      const docRef = await addDoc(collection(db, 'chatRooms'), roomData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating chat room:', error);
      toast({
        title: "Error",
        description: "Failed to create chat room.",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async (roomId: string, message: string, ticketId?: string) => {
    if (!user) return;

    try {
      await addDoc(collection(db, 'chatMessages'), {
        chatRoomId: roomId,
        senderId: user.id,
        message,
        ticketId,
        createdAt: serverTimestamp()
      });

      // Update room's last activity
      await updateDoc(doc(db, 'chatRooms', roomId), {
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive",
      });
    }
  };

  const joinRoom = async (roomId: string) => {
    if (!user || user.role === 'customer') return;

    try {
      await updateDoc(doc(db, 'chatRooms', roomId), {
        agentId: user.id,
        status: 'active',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: "Error",
        description: "Failed to join room.",
        variant: "destructive",
      });
    }
  };

  return {
    chatRooms,
    activeRoom,
    messages,
    loading,
    setActiveRoom,
    createChatRoom,
    sendMessage,
    joinRoom
  };
};