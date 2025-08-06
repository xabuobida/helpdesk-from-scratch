import React from 'react';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

interface RealtimeWrapperProps {
  children: React.ReactNode;
}

const RealtimeWrapper: React.FC<RealtimeWrapperProps> = ({ children }) => {
  // Set up real-time notifications after AuthProvider is established
  useRealtimeNotifications();
  
  return <>{children}</>;
};

export default RealtimeWrapper;