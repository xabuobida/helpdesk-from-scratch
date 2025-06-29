import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export const useAdminUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const transformedUsers: User[] = (data || []).map((profile: Profile) => ({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        created_at: profile.created_at || new Date().toISOString()
      }));
      
      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (userData: Omit<User, 'id' | 'created_at'> & { password?: string }) => {
    try {
      if (!userData.password) {
        throw new Error('Password is required for creating new users');
      }

      // Create user in Supabase Auth with admin privileges
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name: userData.name,
          role: userData.role,
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create user - no user data returned');
      }

      // The profile will be automatically created by the database trigger
      // We just need to update it with the correct role and name
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: userData.name,
          role: userData.role,
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.warn('Profile update failed, but user was created:', profileError);
        // Don't throw here as the user was successfully created
      }

      toast({
        title: "Success! 🎉",
        description: "User created successfully and can now sign in.",
      });
      
      fetchUsers();
      return true;
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create user.",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateUser = async (userId: string, userData: Omit<User, 'id' | 'created_at'>) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: userData.name,
          email: userData.email,
          role: userData.role,
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Success! 🎉",
        description: "User updated successfully",
      });
      
      fetchUsers();
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // Delete the user from Supabase Auth (this will cascade to profiles)
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      
      if (authError) {
        // If auth deletion fails, try deleting just the profile
        console.warn('Auth user deletion failed, attempting profile deletion:', authError);
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', userId);
        
        if (profileError) throw profileError;
      }

      toast({
        title: "Success! 👋",
        description: "User deleted successfully",
      });
      
      fetchUsers();
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
      return false;
    }
  };

  const bulkDeleteUsers = async (userIds: string[]) => {
    try {
      // Try to delete users from auth first
      const authDeletionPromises = userIds.map(userId => 
        supabase.auth.admin.deleteUser(userId)
      );
      
      const authResults = await Promise.allSettled(authDeletionPromises);
      
      // For any auth deletions that failed, try deleting just the profile
      const failedAuthDeletions = userIds.filter((_, index) => 
        authResults[index].status === 'rejected'
      );
      
      if (failedAuthDeletions.length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .in('id', failedAuthDeletions);
        
        if (profileError) throw profileError;
      }

      toast({
        title: "Success! 🎉",
        description: `${userIds.length} users deleted successfully`,
      });
      
      fetchUsers();
      return true;
    } catch (error) {
      console.error('Error bulk deleting users:', error);
      toast({
        title: "Error",
        description: "Failed to delete users",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    bulkDeleteUsers,
  };
};