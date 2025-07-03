
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Request notification permission
  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive desktop notifications for important updates.",
        });
      } else if (result === 'denied') {
        toast({
          title: "Notifications Blocked",
          description: "Please enable notifications in your browser settings to receive alerts.",
          variant: "destructive"
        });
      }
      
      return result;
    }
    return 'denied';
  };

  // Show notification with fallback to toast
  const showNotification = (title: string, options?: NotificationOptions) => {
    if (permission === 'granted' && 'Notification' in window) {
      try {
        new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          ...options
        });
      } catch (error) {
        console.error('Failed to show notification:', error);
        // Fallback to toast
        toast({
          title,
          description: options?.body || '',
        });
      }
    } else {
      // Fallback to toast notification
      toast({
        title,
        description: options?.body || '',
      });
    }
  };

  // Initialize permission state
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Auto-request permission for logged-in users (only once)
  useEffect(() => {
    if (user && permission === 'default') {
      // Show a simple toast asking for permission
      toast({
        title: "Enable Notifications?",
        description: "Get notified about new tickets, messages, and updates. Click the Enable button to allow notifications.",
      });
      
      // Auto-request permission after a short delay
      setTimeout(() => {
        requestPermission();
      }, 2000);
    }
  }, [user, permission]);

  return {
    permission,
    requestPermission,
    showNotification,
    isSupported: 'Notification' in window
  };
};
