
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

  const createUser = async (userData: Omit<User, 'id' | 'created_at'>) => {
    try {
      // Generate a random UUID for the new user
      const userId = crypto.randomUUID();
      
      // Insert user profile directly (admin bypass)
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          name: userData.name,
          email: userData.email,
          role: userData.role,
        });

      if (profileError) throw profileError;

      toast({
        title: "Success! 🎉",
        description: "User profile created successfully. User will need to sign up separately.",
      });
      
      fetchUsers();
      return true;
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "Failed to create user profile.",
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
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

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
      const { error } = await supabase
        .from('profiles')
        .delete()
        .in('id', userIds);

      if (error) throw error;

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
