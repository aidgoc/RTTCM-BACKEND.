import { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { usersAPI, cranesAPI } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';
import toast from 'react-hot-toast';

export default function Operators() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const { data, isLoading, refetch: refetchUsers } = useQuery(
    ['operators', { search: searchTerm }],
    () => usersAPI.getAll({ search: searchTerm, role: 'operator' }),
    {
      enabled: user.role === 'manager',
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

  // Debug logging
  console.log('Operators page - User:', user);
  console.log('Operators page - All users:', allUsers);
  console.log('Operators page - All cranes:', allCranes);

  // Filter cranes based on manager's assigned cranes (new RBAC structure)
  const availableCranes = allCranes.filter(crane => {
    return user.assignedCranes && user.assignedCranes.includes(crane.craneId);
  });

  // Filter users to show only operators
  const operators = allUsers.filter(userData => userData.role === 'operator');
  
  console.log('Operators page - Filtered operators:', operators);

  const getStatusBadge = (isActive) => {
    return isActive ? (
      <span className="status-normal">Active</span>
    ) : (
      <span className="status-offline">Inactive</span>
    );
  };

  // Handle crane assignment
  const handleAssignCranes = (userData) => {
    setSelectedUser(userData);
    setShowAssignmentModal(true);
  };

  const handleSaveAssignment = async (selectedCranes) => {
    try {
      const updateData = {
        assignedCranes: selectedCranes
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

  const getAssignmentCount = (userData) => {
    return userData.assignedCranes?.length || 0;
  };

  if (user.role !== 'manager') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operators</h1>
          <p className="text-gray-600">Assign cranes to operators</p>
        </div>
      </div>

      {/* Search */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search operators..."
                className="form-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Operators Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Operator
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Cranes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {operators.map((operator) => (
                <tr key={operator._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {operator.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{operator.name}</div>
                        <div className="text-sm text-gray-500">{operator.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(operator.isActive)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">Assigned:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {getAssignmentCount(operator)}
                      </span>
                      <button
                        onClick={() => handleAssignCranes(operator)}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                      >
                        Assign
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-primary-600 hover:text-primary-900">
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {operators.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No operators found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm
              ? 'Try adjusting your search criteria.'
              : 'No operators have been added to the system yet.'
            }
          </p>
        </div>
      )}

      {/* Crane Assignment Modal */}
      {showAssignmentModal && selectedUser && (
        <CraneAssignmentModal
          user={selectedUser}
          cranes={availableCranes}
          onClose={() => setShowAssignmentModal(false)}
          onSave={handleSaveAssignment}
        />
      )}
    </div>
  );
}

// Crane Assignment Modal Component
function CraneAssignmentModal({ user, cranes, onClose, onSave }) {
  const [selectedCranes, setSelectedCranes] = useState(
    user.assignedCranes || []
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
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Assign Cranes to {user.name}
          </h3>
          <p className="text-sm text-gray-500">
            Select cranes to assign to this operator
          </p>
        </div>
        
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-1 gap-3">
            {cranes.map((crane) => (
              <label
                key={crane.craneId}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                  isAssigned(crane.craneId)
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isAssigned(crane.craneId)}
                  onChange={() => handleCraneToggle(crane.craneId)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="ml-3 flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {crane.name} ({crane.craneId})
                  </div>
                  <div className="text-sm text-gray-500">
                    {crane.location}
                  </div>
                  <div className="flex items-center mt-1">
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      crane.online ? 'bg-green-400' : 'bg-red-400'
                    }`}></div>
                    <span className="text-xs text-gray-500">
                      {crane.online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
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
