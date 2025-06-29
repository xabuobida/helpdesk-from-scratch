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
      console.log('Checking profile for user:', authUser.id);
      
      // First, try to get existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching profile:', fetchError);
        return null;
      }

      if (existingProfile) {
        console.log('Found existing profile:', existingProfile);
        return existingProfile;
      }

      // Profile doesn't exist, create it
      console.log('Creating profile for user:', authUser.id);
      const profileData = {
        id: authUser.id,
        email: authUser.email || '',
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        role: authUser.user_metadata?.role || 'customer'
      };

      console.log('Profile data to insert:', profileData);

      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (insertError) {
        console.error('Error creating profile:', insertError);
        // If insert fails, try to fetch again in case it was created by trigger
        const { data: retryProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();
        
        return retryProfile;
      }

      console.log('Created new profile:', newProfile);
      return newProfile;
    } catch (error) {
      console.error('Error in createProfileIfNotExists:', error);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (!mounted) return;
        
        setSession(session);
        
        if (session?.user) {
          // Get or create user profile
          const profile = await createProfileIfNotExists(session.user);
          
          if (profile && mounted) {
            setUser({
              id: profile.id,
              email: profile.email,
              name: profile.name,
              role: profile.role as 'admin' | 'agent' | 'customer'
            });
          } else if (mounted) {
            console.error('Failed to get or create user profile');
            // Create a basic user object from auth data as fallback
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
              role: (session.user.user_metadata?.role as 'admin' | 'agent' | 'customer') || 'customer'
            });
          }
        } else if (mounted) {
          setUser(null);
        }
        
        if (mounted) {
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        }
        
        if (session && mounted) {
          // This will trigger the auth state change listener above
          console.log('Found existing session for user:', session.user.id);
        } else if (mounted) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      setIsLoading(true);
      console.log('Attempting login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Login error:', error);
        
        // Check for specific error types
        if (error.message === 'Invalid login credentials') {
          return {
            success: false,
            error: {
              code: 'invalid_credentials',
              message: 'Invalid login credentials'
            }
          };
        } else if (error.message === 'Email not confirmed') {
          return {
            success: false,
            error: {
              code: 'email_not_confirmed',
              message: 'Email not confirmed'
            }
          };
        } else {
          return {
            success: false,
            error: {
              code: error.name?.toLowerCase() || 'auth_error',
              message: error.message
            }
          };
        }
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
      console.log('Attempting signup for:', email, 'with role:', role);
      
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
      
      // If user is immediately confirmed (no email confirmation required)
      if (data.user && !data.user.email_confirmed_at) {
        console.log('User created but email not confirmed');
      } else if (data.user && data.user.email_confirmed_at) {
        console.log('User created and email confirmed');
      }
      
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
    console.log('Logging out user');
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