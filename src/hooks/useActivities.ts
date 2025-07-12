
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ActivityItem } from '@/types/ticket';

export const useActivities = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
    
    // Set up real-time subscription for activities
    const channel = supabase
      .channel('activities-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activities'
        },
        () => {
          fetchActivities();
        }
      );

    // Only subscribe if the channel is not already subscribed
    if (channel.state === 'closed') {
      channel.subscribe();
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActivities = async () => {
    try {
      const { data: activitiesData, error } = await supabase
        .from('activities')
        .select(`
          *,
          user:profiles(name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching activities:', error);
        return;
      }

      const formattedActivities: ActivityItem[] = (activitiesData || []).map(activity => ({
        id: activity.id,
        type: getActivityType(activity.message),
        ticketId: extractTicketId(activity.message),
        userName: activity.user?.name || 'Unknown User',
        userAvatar: activity.user?.avatar_url || `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face`,
        message: activity.message,
        timestamp: new Date(activity.created_at)
      }));

      setActivities(formattedActivities);
    } catch (error) {
      console.error('Error in fetchActivities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityType = (message: string): ActivityItem['type'] => {
    if (message.includes('created')) return 'created';
    if (message.includes('assigned')) return 'assigned';
    if (message.includes('resolved') || message.includes('closed')) return 'resolved';
    if (message.includes('commented')) return 'commented';
    return 'status_changed';
  };

  const extractTicketId = (message: string): string => {
    const match = message.match(/#(\w+)/);
    return match ? match[1] : '';
  };

  const addActivity = async (message: string) => {
    try {
      const { error } = await supabase
        .from('activities')
        .insert({ message });

      if (error) {
        console.error('Error adding activity:', error);
      }
    } catch (error) {
      console.error('Error in addActivity:', error);
    }
  };

  return { activities, loading, addActivity };
};
