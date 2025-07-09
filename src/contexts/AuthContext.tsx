
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { AuthContextType, UserProfile } from '@/types/auth';
import { createProfileIfNotExists } from '@/utils/authUtils';
import { useAuthOperations } from '@/hooks/useAuthOperations';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { login, signup, logout: performLogout } = useAuthOperations();
  
  // Set up real-time notifications globally
  useRealtimeNotifications();

  useEffect(() => {
    let isInitialized = false;
    
    // Listen for auth changes first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await createProfileIfNotExists(session.user);
        if (profile) {
          setUser(profile);
          setSession(session);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
      }
      
      // Only set loading to false after initial auth check
      if (!isInitialized) {
        setIsLoading(false);
        isInitialized = true;
      }
    });

    // Get initial session only once
    const getInitialSession = async () => {
      if (isInitialized) return;
      
      console.log('Getting initial session...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        setIsLoading(false);
        isInitialized = true;
        return;
      }

      if (session?.user) {
        console.log('Found existing session for user:', session.user.id);
        const profile = await createProfileIfNotExists(session.user);
        if (profile) {
          setUser(profile);
          setSession(session);
        }
      }
      
      if (!isInitialized) {
        setIsLoading(false);
        isInitialized = true;
      }
    };

    getInitialSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await performLogout();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
