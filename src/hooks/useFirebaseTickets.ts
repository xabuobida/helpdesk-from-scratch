import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  getDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/FirebaseAuthContext';
import { FirebaseTicket } from '@/types/firebase';
import { Ticket } from '@/types/ticket';
import { useToast } from '@/hooks/use-toast';

export const useFirebaseTickets = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTickets([]);
      setLoading(false);
      return;
    }

    let q;
    if (user.role === 'customer') {
      q = query(
        collection(db, 'tickets'),
        where('customerId', '==', user.id),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'tickets'),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const ticketPromises = snapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();
        
        // Get customer info
        let customerInfo = { name: '', email: '' };
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
        if (data.assignedTo) {
          const agentDoc = await getDoc(doc(db, 'users', data.assignedTo));
          if (agentDoc.exists()) {
            const agentData = agentDoc.data();
            agentInfo = {
              name: agentData.name || ''
            };
          }
        }

        return {
          id: docSnapshot.id,
          title: data.title,
          description: data.description,
          status: data.status,
          priority: data.priority,
          category: data.category,
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
          assignedTo: agentInfo?.name,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Ticket;
      });

      const resolvedTickets = await Promise.all(ticketPromises);
      setTickets(resolvedTickets);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching tickets:', error);
      toast({
        title: "Error",
        description: "Failed to load tickets.",
        variant: "destructive",
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  const createTicket = async (ticketData: {
    title: string;
    description: string;
    priority: string;
    category: string;
  }) => {
    if (!user) return;

    try {
      await addDoc(collection(db, 'tickets'), {
        title: ticketData.title,
        description: ticketData.description,
        status: 'open',
        priority: ticketData.priority,
        category: ticketData.category,
        customerId: user.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Success",
        description: "Ticket created successfully.",
      });
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Error",
        description: "Failed to create ticket.",
        variant: "destructive",
      });
    }
  };

  const updateTicket = async (ticketId: string, updates: Partial<FirebaseTicket>) => {
    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      await updateDoc(ticketRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Success",
        description: "Ticket updated successfully.",
      });
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast({
        title: "Error",
        description: "Failed to update ticket.",
        variant: "destructive",
      });
    }
  };

  const deleteTicket = async (ticketId: string) => {
    try {
      await deleteDoc(doc(db, 'tickets', ticketId));
      
      toast({
        title: "Success",
        description: "Ticket deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast({
        title: "Error",
        description: "Failed to delete ticket.",
        variant: "destructive",
      });
    }
  };

  return {
    tickets,
    loading,
    createTicket,
    updateTicket,
    deleteTicket,
  };
};