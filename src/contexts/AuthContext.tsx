import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'agent' | 'customer';
}

interface AuthResult {
  success: boolean;
  error?: {
    code?: string;
    message?: string;
  };
}

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (email: string, password: string, name: string, role: string) => Promise<AuthResult>;
  logout: () => void;
  isLoading: boolean;
}

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

  const createProfileIfNotExists = async (authUser: User) => {
    try {
      // First, try to get existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (existingProfile && !fetchError) {
        // Profile exists, return it
        return existingProfile;
      }

      // Profile doesn't exist, create it
      console.log('Creating profile for user:', authUser.id);
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
          role: authUser.user_metadata?.role || 'customer'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating profile:', insertError);
        return null;
      }

      return newProfile;
    } catch (error) {
      console.error('Error in createProfileIfNotExists:', error);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        
        if (session?.user) {
          // Get or create user profile
          const profile = await createProfileIfNotExists(session.user);
          
          if (profile) {
            setUser({
              id: profile.id,
              email: profile.email,
              name: profile.name,
              role: profile.role as 'admin' | 'agent' | 'customer'
            });
          } else {
            console.error('Failed to get or create user profile');
            // Don't set user to null here, as it might cause redirect loops
            // Instead, create a basic user object from auth data
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
              role: (session.user.user_metadata?.role as 'admin' | 'agent' | 'customer') || 'customer'
            });
          }
        } else {
          setUser(null);
        }
        
        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // This will trigger the auth state change listener above
        setSession(session);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Login error:', error);
        return {
          success: false,
          error: {
            code: error.message === 'Email not confirmed' ? 'email_not_confirmed' : 'invalid_credentials',
            message: error.message
          }
        };
      }
      
      console.log('Login successful:', data.user?.id);
      return { success: true };
    } catch (error) {
      console.error('Login exception:', error);
      return {
        success: false,
        error: {
          message: 'An unexpected error occurred'
        }
      };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string, role: string): Promise<AuthResult> => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role
          }
        }
      });
      
      if (error) {
        console.error('Signup error:', error);
        return {
          success: false,
          error: {
            code: error.name?.toLowerCase(),
            message: error.message
          }
        };
      }
      
      console.log('Signup successful:', data.user?.id);
      return { success: true };
    } catch (error) {
      console.error('Signup exception:', error);
      return {
        success: false,
        error: {
          message: 'An unexpected error occurred'
        }
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};