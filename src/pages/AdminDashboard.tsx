import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, UserPlus, Search, Filter, Trash2, Edit, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import UserModal from '@/components/admin/UserModal';
import DeleteConfirmModal from '@/components/admin/DeleteConfirmModal';
import BulkDeleteModal from '@/components/admin/BulkDeleteModal';
import { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface User {
  id: string;
  name: string;
  email: string;
  role: string; // Changed from union type to string to match database
  created_at: string;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userModal, setUserModal] = useState<{ open: boolean; user?: User; mode: 'create' | 'edit' }>({
    open: false,
    mode: 'create'
  });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; user?: User }>({ open: false });
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  // Fetch users from database
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our User interface
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

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users based on search and role
  useEffect(() => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedRole !== 'all') {
      filtered = filtered.filter(user => user.role === selectedRole);
    }

    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [users, searchTerm, selectedRole]);

  // Get user counts by role
  const getUserCounts = () => {
    return {
      all: users.length,
      customer: users.filter(u => u.role === 'customer').length,
      agent: users.filter(u => u.role === 'agent').length,
      admin: users.filter(u => u.role === 'admin').length,
    };
  };

  // Handle user creation/update
  const handleUserSave = async (userData: Omit<User, 'id' | 'created_at'>) => {
    try {
      if (userModal.mode === 'create') {
        // For creation, we'll need to handle auth signup and profile creation
        toast({
          title: "Info",
          description: "User creation requires additional backend setup",
        });
      } else if (userModal.user) {
        const { error } = await supabase
          .from('profiles')
          .update({
            name: userData.name,
            email: userData.email,
            role: userData.role,
          })
          .eq('id', userModal.user.id);

        if (error) throw error;

        toast({
          title: "Success! 🎉",
          description: "User updated successfully",
        });
        
        fetchUsers();
      }
    } catch (error) {
      console.error('Error saving user:', error);
      toast({
        title: "Error",
        description: "Failed to save user",
        variant: "destructive",
      });
    }
    
    setUserModal({ open: false, mode: 'create' });
  };

  // Handle user deletion
  const handleDeleteUser = async (userId: string) => {
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
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
    
    setDeleteModal({ open: false });
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .in('id', selectedUsers);

      if (error) throw error;

      toast({
        title: "Success! 🎉",
        description: `${selectedUsers.length} users deleted successfully`,
      });
      
      setSelectedUsers([]);
      fetchUsers();
    } catch (error) {
      console.error('Error bulk deleting users:', error);
      toast({
        title: "Error",
        description: "Failed to delete users",
        variant: "destructive",
      });
    }
    
    setBulkDeleteModal(false);
  };

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage);

  const counts = getUserCounts();

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600">You need admin privileges to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage all users across your helpdesk system</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.all}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.customer}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agents</CardTitle>
              <Users className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.agent}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admins</CardTitle>
              <Users className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.admin}</div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col md:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="customer">Customers</SelectItem>
                    <SelectItem value="agent">Agents</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2">
                {selectedUsers.length > 0 && (
                  <Button
                    variant="destructive"
                    onClick={() => setBulkDeleteModal(true)}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Selected ({selectedUsers.length})
                  </Button>
                )}
                
                <Button
                  onClick={() => setUserModal({ open: true, mode: 'create' })}
                  className="gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Add User
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              Showing {paginatedUsers.length} of {filteredUsers.length} users
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading users...</div>
            ) : paginatedUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No users found</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4">
                          <Checkbox
                            checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedUsers(paginatedUsers.map(u => u.id));
                              } else {
                                setSelectedUsers([]);
                              }
                            }}
                          />
                        </th>
                        <th className="text-left p-4">Name</th>
                        <th className="text-left p-4">Email</th>
                        <th className="text-left p-4">Role</th>
                        <th className="text-left p-4">Created</th>
                        <th className="text-left p-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedUsers.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <Checkbox
                              checked={selectedUsers.includes(user.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedUsers([...selectedUsers, user.id]);
                                } else {
                                  setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                                }
                              }}
                            />
                          </td>
                          <td className="p-4 font-medium">{user.name}</td>
                          <td className="p-4 text-gray-600">{user.email}</td>
                          <td className="p-4">
                            <Badge
                              variant={
                                user.role === 'admin' ? 'destructive' :
                                user.role === 'agent' ? 'default' : 'secondary'
                              }
                              className="capitalize"
                            >
                              {user.role}
                            </Badge>
                          </td>
                          <td className="p-4 text-gray-600">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setUserModal({ open: true, user, mode: 'edit' })}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteModal({ open: true, user })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-gray-600">
                      Showing {startIndex + 1} to {Math.min(startIndex + usersPerPage, filteredUsers.length)} of {filteredUsers.length} users
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="px-3 py-2 text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Modals */}
        <UserModal
          open={userModal.open}
          onOpenChange={(open) => setUserModal({ ...userModal, open })}
          user={userModal.user}
          mode={userModal.mode}
          onSave={handleUserSave}
        />

        <DeleteConfirmModal
          open={deleteModal.open}
          onOpenChange={(open) => setDeleteModal({ ...deleteModal, open })}
          user={deleteModal.user}
          onConfirm={() => deleteModal.user && handleDeleteUser(deleteModal.user.id)}
        />

        <BulkDeleteModal
          open={bulkDeleteModal}
          onOpenChange={setBulkDeleteModal}
          count={selectedUsers.length}
          onConfirm={handleBulkDelete}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
