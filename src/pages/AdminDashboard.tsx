import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import UserModal from '@/components/admin/UserModal';
import DeleteConfirmModal from '@/components/admin/DeleteConfirmModal';
import BulkDeleteModal from '@/components/admin/BulkDeleteModal';
import AdminStatsCards from '@/components/admin/AdminStatsCards';
import AdminControls from '@/components/admin/AdminControls';
import UsersTable from '@/components/admin/UsersTable';
import { useAdminUsers, User } from '@/hooks/useAdminUsers';

const AdminDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { users, loading, createUser, updateUser, deleteUser, bulkDeleteUsers } = useAdminUsers();
  
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
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

  // Handle user creation/update
  const handleUserSave = async (userData: Omit<User, 'id' | 'created_at'>) => {
    try {
      if (userModal.mode === 'create') {
        await createUser(userData);
      } else if (userModal.user) {
        await updateUser(userModal.user.id, userData);
      }
    } catch (error) {
      console.error('Error saving user:', error);
    }
    
    setUserModal({ open: false, mode: 'create' });
  };

  // Handle user deletion
  const handleDeleteUser = async (userId: string) => {
    await deleteUser(userId);
    setDeleteModal({ open: false });
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    await bulkDeleteUsers(selectedUsers);
    setSelectedUsers([]);
    setBulkDeleteModal(false);
  };

  // Handle user selection
  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    const paginatedUsers = filteredUsers.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage);
    if (checked) {
      setSelectedUsers(paginatedUsers.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

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
        <AdminStatsCards users={users} />

        {/* Controls */}
        <AdminControls
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedRole={selectedRole}
          setSelectedRole={setSelectedRole}
          selectedUsers={selectedUsers}
          onBulkDelete={() => setBulkDeleteModal(true)}
          onAddUser={() => setUserModal({ open: true, mode: 'create' })}
        />

        {/* Users Table */}
        <UsersTable
          users={filteredUsers}
          loading={loading}
          selectedUsers={selectedUsers}
          onSelectUser={handleSelectUser}
          onSelectAll={handleSelectAll}
          onEditUser={(user) => setUserModal({ open: true, user, mode: 'edit' })}
          onDeleteUser={(user) => setDeleteModal({ open: true, user })}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          usersPerPage={usersPerPage}
        />

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
