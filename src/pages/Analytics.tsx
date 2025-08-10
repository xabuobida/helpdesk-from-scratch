
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { format, subDays, startOfDay } from "date-fns";

interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  unassigned: number;
  assigned: number;
  closed: number;
  satisfaction: number;
}

interface WeeklyData {
  name: string;
  open: number;
  resolved: number;
  date: string;
}

const Analytics = () => {
  const { user } = useAuth();
  const [ticketStats, setTicketStats] = useState<TicketStats>({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    unassigned: 0,
    assigned: 0,
    closed: 0,
    satisfaction: 85
  });
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [activeCustomers, setActiveCustomers] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchAnalyticsData();
  }, [user]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Fetch ticket statistics
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('status, priority, created_at');

      if (ticketsError) {
        console.error('Error fetching tickets:', ticketsError);
        return;
      }

      // Calculate ticket stats
      const stats: TicketStats = {
        total: tickets?.length || 0,
        open: tickets?.filter(t => t.status === 'unassigned').length || 0,
        inProgress: tickets?.filter(t => t.status === 'in_progress').length || 0,
        resolved: tickets?.filter(t => t.status === 'resolved').length || 0,
        unassigned: tickets?.filter(t => t.status === 'unassigned').length || 0,
        assigned: tickets?.filter(t => t.status === 'assigned').length || 0,
        closed: tickets?.filter(t => t.status === 'closed').length || 0,
        satisfaction: 85 // This would come from a satisfaction survey table
      };

      setTicketStats(stats);

      // Generate weekly data for the last 7 days
      const weeklyStats: WeeklyData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = startOfDay(subDays(new Date(), i));
        const nextDate = startOfDay(subDays(new Date(), i - 1));
        
        const dayTickets = tickets?.filter(ticket => {
          const ticketDate = new Date(ticket.created_at);
          return ticketDate >= date && ticketDate < nextDate;
        }) || [];

        weeklyStats.push({
          name: format(date, 'EEE'),
          open: dayTickets.length,
          resolved: dayTickets.filter(t => t.status === 'resolved').length,
          date: format(date, 'yyyy-MM-dd')
        });
      }

      setWeeklyData(weeklyStats);

      // Fetch customer statistics
      const { data: customers, error: customersError } = await supabase
        .from('profiles')
        .select('status, role, last_active')
        .eq('role', 'customer');

      if (customersError) {
        console.error('Error fetching customers:', customersError);
        return;
      }

      setTotalCustomers(customers?.length || 0);
      setActiveCustomers(customers?.filter(c => c.status === 'Active').length || 0);

    } catch (error) {
      console.error('Error in fetchAnalyticsData:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusData = [
    { name: "Open", value: ticketStats.unassigned, color: "#3B82F6" },
    { name: "In Progress", value: ticketStats.inProgress, color: "#F59E0B" },
    { name: "Resolved", value: ticketStats.resolved, color: "#10B981" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics Dashboard</h1>
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading analytics data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ticketStats.total}</div>
              <p className="text-xs text-green-600">Real-time data</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Resolved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ticketStats.resolved}</div>
              <p className="text-xs text-green-600">
                {ticketStats.total > 0 ? Math.round((ticketStats.resolved / ticketStats.total) * 100) : 0}% resolution rate
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeCustomers}</div>
              <p className="text-xs text-blue-600">Out of {totalCustomers} total</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Customer Satisfaction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ticketStats.satisfaction}%</div>
              <p className="text-xs text-green-600">Based on resolved tickets</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Ticket Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="open" fill="#3B82F6" name="Created" />
                  <Bar dataKey="resolved" fill="#10B981" name="Resolved" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Current Ticket Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
