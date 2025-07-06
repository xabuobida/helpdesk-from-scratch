export interface SupabaseTicket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  customer_id: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  customer: {
    name: string;
    email: string;
  };
  agent?: {
    name: string;
  };
}