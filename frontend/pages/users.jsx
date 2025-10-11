import { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { usersAPI, cranesAPI } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';
import UserCreationForm from '../src/components/forms/UserCreationForm';
import toast from 'react-hot-toast';

export default function Users() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [assignmentType, setAssignmentType] = useState('assignedCranes'); // 'assignedCranes' or 'managedCranes'
  const [showUserForm, setShowUserForm] = useState(false);

  const { data, isLoading, refetch: refetchUsers } = useQuery(
    ['users', { search: searchTerm, role: roleFilter }],
    () => usersAPI.getAll({ search: searchTerm, role: roleFilter !== 'all' ? roleFilter : undefined }),
    {
      enabled: ['admin', 'manager'].includes(user.role),
      refetchInterval: 10000, // Auto-refresh every 10 seconds
    }
  );

  // Fetch cranes for assignment
  const { data: cranesData } = useQuery(
    'cranes',
    () => cranesAPI.getAll({ limit: 100 }),
    {
      enabled: showAssignmentModal,
    }
  );

  const allUsers = data?.data?.users || [];
  const allCranes = cranesData?.data?.cranes || [];

  // Filter cranes based on user role
  const availableCranes = allCranes.filter(crane => {
    if (user.role === 'admin') {
      // Admin can assign any crane
      return true;
    } else if (user.role === 'manager') {
      // Manager can only assign cranes they manage (stored in assignedCranes)
      return user.assignedCranes && user.assignedCranes.includes(crane.craneId);
    }
    return false;
  });

  // Filter users based on current user role
  const users = allUsers.filter(userData => {
    if (user.role === 'admin') {
      // Admin can see all users
      return true;
    } else if (user.role === 'manager') {
      // Manager can see supervisors and operators
      return userData.role === 'supervisor' || userData.role === 'operator';
    }
    return false;
  });

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="status-critical">Admin</span>;
      case 'manager':
        return <span className="status-warning">Manager</span>;
      case 'supervisor':
        return <span className="status-info">Supervisor</span>;
      case 'operator':
        return <span className="status-normal">Operator</span>;
      default:
        return <span className="status-normal">{role}</span>;
    }
  };

  const getStatusBadge = (isActive) => {
    return isActive ? (
      <span className="status-normal">Active</span>
    ) : (
      <span className="status-offline">Inactive</span>
    );
  };

  // Handle crane assignment
  const handleAssignCranes = (userData, type) => {
    setSelectedUser(userData);
    setAssignmentType(type);
    setShowAssignmentModal(true);
  };

  const handleSaveAssignment = async (selectedCranes) => {
    try {
      const updateData = {
        [assignmentType]: selectedCranes
      };

      await usersAPI.update(selectedUser._id, updateData);
      toast.success('Crane assignment updated successfully');
      setShowAssignmentModal(false);
      refetchUsers();
      
      // Invalidate cranes cache to refresh assets page
      queryClient.invalidateQueries('cranes');
    } catch (error) {
      toast.error('Failed to update crane assignment');
      console.error('Assignment error:', error);
    }
  };

  const getAssignmentCount = (userData, type) => {
    return userData[type]?.length || 0;
  };

  // Handle view user
  const handleViewUser = (userData) => {
    // For now, just show an alert with user details
    // In a real app, this would open a detailed view modal
    alert(`User Details:\nName: ${userData.name}\nEmail: ${userData.email}\nRole: ${userData.role}\nStatus: ${userData.isActive ? 'Active' : 'Inactive'}\nLast Login: ${userData.lastLogin ? new Date(userData.lastLogin).toLocaleString() : 'Never'}`);
  };

  // Handle edit user
  const handleEditUser = (userData) => {
    // For now, just show an alert
    // In a real app, this would open an edit form
    alert(`Edit user: ${userData.name}\nThis would open an edit form in a real application.`);
  };

  // Handle deactivate user
  const handleDeactivateUser = async (userData) => {
    if (window.confirm(`Are you sure you want to deactivate ${userData.name}?`)) {
      try {
        await usersAPI.update(userData._id, { isActive: false });
        toast.success('User deactivated successfully');
        refetchUsers();
      } catch (error) {
        toast.error('Failed to deactivate user');
        console.error('Deactivate error:', error);
      }
    }
  };

  if (!['admin', 'manager'].includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-300">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
          <p className="text-gray-600 dark:text-gray-300">
            {user.role === 'admin' 
              ? 'Manage system users and permissions'
              : 'Assign cranes to operators'
            }
          </p>
        </div>
        
        {(user.role === 'admin' || user.role === 'manager') && (
          <button 
            onClick={() => setShowUserForm(true)}
            className="btn-primary"
          >
            Add User
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search users..."
                className="form-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {user.role === 'admin' && (
              <div className="sm:w-48">
                <select
                  className="form-input"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="operator">Operator</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
                {(user.role === 'admin' || user.role === 'manager') && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {user.role === 'admin' ? 'Crane Assignments' : 'Assigned Cranes'}
                </th>
                {(user.role === 'admin' || user.role === 'manager') && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Last Login
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((userData) => (
                <tr key={userData._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {userData.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{userData.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{userData.email}</div>
                      </div>
                    </div>
                  </td>
                  {(user.role === 'admin' || user.role === 'manager') && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(userData.role)}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(userData.isActive)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-2">
                      {/* Assigned Cranes (for operators) */}
                      {userData.role === 'operator' && (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Assigned:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {getAssignmentCount(userData, 'assignedCranes')}
                          </span>
                          {/* Show Assign button for managers and supervisors */}
                          {(user.role === 'manager' || user.role === 'supervisor') && (
                            <button
                              onClick={() => handleAssignCranes(userData, 'assignedCranes')}
                              className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                            >
                              Assign
                            </button>
                          )}
                        </div>
                      )}
                      
                      {/* Assigned Cranes (for supervisors) */}
                      {userData.role === 'supervisor' && (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Assigned:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {getAssignmentCount(userData, 'assignedCranes')}
                          </span>
                          {/* Show Assign button for managers */}
                          {user.role === 'manager' && (
                            <button
                              onClick={() => handleAssignCranes(userData, 'assignedCranes')}
                              className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded hover:bg-green-200 dark:hover:bg-green-800"
                            >
                              Assign
                            </button>
                          )}
                        </div>
                      )}
                      
                      {/* Managed Cranes (for managers) - only show for admin */}
                      {user.role === 'admin' && userData.role === 'manager' && (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Managed:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {getAssignmentCount(userData, 'assignedCranes')}
                          </span>
                          {/* Only show Assign button for managers (not admins) */}
                          {user.role === 'manager' && (
                            <button
                              onClick={() => handleAssignCranes(userData, 'assignedCranes')}
                              className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded hover:bg-green-200 dark:hover:bg-green-800"
                            >
                              Assign
                            </button>
                          )}
                        </div>
                      )}
                      
                      {/* Admin - show both */}
                      {user.role === 'admin' && userData.role === 'admin' && (
                        <div className="text-xs text-gray-500">
                          Full Access
                        </div>
                      )}
                    </div>
                  </td>
                  {(user.role === 'admin' || user.role === 'manager') && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {userData.lastLogin 
                        ? new Date(userData.lastLogin).toLocaleString()
                        : 'Never'
                      }
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleViewUser(userData)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                      >
                        View
                      </button>
                      {(user.role === 'admin' || user.role === 'manager') && (
                        <>
                          <button 
                            onClick={() => handleEditUser(userData)}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 font-medium"
                          >
                            Edit
                          </button>
                          {userData._id !== user._id && (
                            <button 
                              onClick={() => handleDeactivateUser(userData)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 font-medium"
                            >
                              Deactivate
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {users.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No users found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm || roleFilter !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'No users have been added to the system yet.'
            }
          </p>
        </div>
      )}

      {/* User Creation Form */}
      <UserCreationForm
        isOpen={showUserForm}
        onClose={() => setShowUserForm(false)}
        onUserCreated={() => {
          refetchUsers();
          setShowUserForm(false);
        }}
      />

      {/* Crane Assignment Modal */}
      {showAssignmentModal && selectedUser && (
        <CraneAssignmentModal
          user={selectedUser}
          cranes={availableCranes}
          assignmentType={assignmentType}
          onClose={() => setShowAssignmentModal(false)}
          onSave={handleSaveAssignment}
        />
      )}
    </div>
  );
}

// Crane Assignment Modal Component
function CraneAssignmentModal({ user, cranes, assignmentType, onClose, onSave }) {
  const [selectedCranes, setSelectedCranes] = useState(
    user[assignmentType] || []
  );

  const handleCraneToggle = (craneId) => {
    setSelectedCranes(prev => {
      if (prev.includes(craneId)) {
        return prev.filter(id => id !== craneId);
      } else {
        return [...prev, craneId];
      }
    });
  };

  const handleSave = () => {
    onSave(selectedCranes);
  };

  const isAssigned = (craneId) => selectedCranes.includes(craneId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Assign Cranes to {user.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {assignmentType === 'assignedCranes' 
              ? 'Select cranes to assign to this operator'
              : 'Select cranes to assign to this manager'
            }
          </p>
        </div>
        
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-1 gap-3">
            {cranes.map((crane) => (
              <label
                key={crane.craneId}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                  isAssigned(crane.craneId)
                    ? 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isAssigned(crane.craneId)}
                  onChange={() => handleCraneToggle(crane.craneId)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <div className="ml-3 flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {crane.name} ({crane.craneId})
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {crane.location}
                  </div>
                  <div className="flex items-center mt-1">
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      crane.online ? 'bg-green-400' : 'bg-red-400'
                    }`}></div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {crane.online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Save Assignment
          </button>
        </div>
      </div>
    </div>
  );
}
