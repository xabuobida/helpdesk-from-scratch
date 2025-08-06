import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserProfile } from '@/types/firebase';
import { useToast } from '@/hooks/use-toast';

interface AuthResult {
  success: boolean;
  error?: {
    code?: string;
    message?: string;
  };
}

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: User | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (email: string, password: string, name: string, role: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
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
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setFirebaseUser(firebaseUser);
        
        // Get user profile from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email!,
              name: userData.name,
              role: userData.role,
              createdAt: userData.createdAt?.toDate(),
              updatedAt: userData.updatedAt?.toDate(),
              ...userData
            });
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      };
    }
  };

  const signup = async (email: string, password: string, name: string, role: string): Promise<AuthResult> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name
      await updateProfile(user, { displayName: name });

      // Create user profile in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        role: role || 'customer',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ticketsCount: 0,
        status: 'Active'
      });

      return { success: true };
    } catch (error: any) {
      console.error('Signup error:', error);
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      firebaseUser, 
      login, 
      signup, 
      logout, 
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};