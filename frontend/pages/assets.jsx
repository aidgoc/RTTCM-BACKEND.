import { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { cranesAPI, usersAPI } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';
import toast from 'react-hot-toast';

export default function Assets() {
  const { user, checkAuth } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assigningCrane, setAssigningCrane] = useState(null);
  const [selectedSupervisors, setSelectedSupervisors] = useState([]);

  const { data, isLoading, refetch } = useQuery(
    'cranes',
    () => cranesAPI.getAll({ 
      search: searchTerm || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      limit: 100 
    }),
    {
      enabled: true,
      refetchInterval: 10000, // Auto-refresh every 10 seconds
      refetchIntervalInBackground: true,
    }
  );

  const { data: supervisorsData } = useQuery(
    'supervisors',
    () => usersAPI.getAll({ role: 'supervisor' }),
    {
      enabled: user.role === 'manager',
    }
  );

  const allCranes = data?.data?.cranes || [];

  // Filter cranes based on user role and assignments (new RBAC structure)
  const cranes = allCranes.filter(crane => {
    if (user.role === 'admin') {
      // Admin can see all cranes
      return true;
    } else if (user.role === 'manager') {
      // Manager can see all cranes they manage
      return user.assignedCranes && user.assignedCranes.includes(crane.craneId);
    } else if (user.role === 'supervisor') {
      // Supervisor can only see cranes assigned to them by manager
      return user.assignedCranes && user.assignedCranes.includes(crane.craneId);
    } else if (user.role === 'operator') {
      // Operator can only see cranes assigned to them by supervisor
      return user.assignedCranes && user.assignedCranes.includes(crane.craneId);
    }
    return false;
  });

  const filteredCranes = cranes.filter(crane => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'online') return crane.online;
    if (statusFilter === 'offline') return !crane.online;
    if (statusFilter === 'overloaded') return crane.isOverloaded;
    return true;
  });

  const getStatusBadge = (crane) => {
    const status = crane.statusSummary?.status || (crane.online ? 'normal' : 'offline');
    
    switch (status) {
      case 'overload':
        return <span className="status-critical">Overloaded</span>;
      case 'warning':
        return <span className="status-warning">Warning</span>;
      case 'offline':
        return <span className="status-offline">Offline</span>;
      default:
        return <span className="status-normal">Normal</span>;
    }
  };

  const handleAssignSupervisors = (crane) => {
    setAssigningCrane(crane);
    setSelectedSupervisors([]);
  };

  const handleSaveAssignment = async () => {
    if (!assigningCrane) return;

    try {
      // Use the new assignment API
      const supervisorIds = selectedSupervisors;
      
      await Promise.all(supervisorIds.map(async (supervisorId) => {
        await usersAPI.update(supervisorId, {
          assignedCranes: [...(supervisorsData?.data?.users?.find(s => s._id === supervisorId)?.assignedCranes || []), assigningCrane.craneId]
        });
      }));

      toast.success('Supervisors assigned successfully!');
      setAssigningCrane(null);
      setSelectedSupervisors([]);
      refetch();
      // Refresh user data to update assignedCranes
      checkAuth();
    } catch (error) {
      toast.error('Failed to assign supervisors');
      console.error('Assignment error:', error);
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
          <p className="text-gray-600">Manage and monitor your tower crane fleet</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              refetch();
              toast.success('Data refreshed successfully');
            }}
            className="btn-secondary flex items-center gap-2"
            disabled={isLoading}
          >
            <svg 
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
              />
            </svg>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card hover:shadow-lg hover:border-cyan-400/60 transition-all duration-300">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search cranes..."
                className="form-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="sm:w-48">
              <select
                className="form-input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="overloaded">Overloaded</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  refetch();
                  toast.success('Data refreshed successfully');
                }}
                className="btn-outline flex items-center gap-2 px-3 py-2 text-sm"
                disabled={isLoading}
                title="Refresh data to see latest assignments"
              >
                <svg 
                  className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                </svg>
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cranes Table */}
      <div className="card hover:shadow-lg hover:border-cyan-400/60 transition-all duration-300">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Crane
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Load
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Utilization
                </th>
                {user.role === 'admin' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Manager
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Operator(s)
                </th>
                {(user.role === 'admin' || user.role === 'manager') && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Supervisors
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Last Seen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCranes.map((crane) => (
                <tr key={crane.craneId} className="hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md transition-all duration-300 group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors duration-300">{crane.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">{crane.craneId}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">{crane.location}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(crane)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">
                      {crane.currentLoad || 0}kg / {crane.swl}kg
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mr-2 group-hover:bg-gray-300 dark:group-hover:bg-gray-500 transition-colors duration-300">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 group-hover:scale-105 ${
                            (crane.utilization || 0) > 95 ? 'bg-red-500 group-hover:bg-red-600' :
                            (crane.utilization || 0) > 80 ? 'bg-yellow-500 group-hover:bg-yellow-600' :
                            'bg-green-500 group-hover:bg-green-600'
                          }`}
                          style={{ width: `${Math.min(crane.utilization || 0, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors duration-300">{crane.utilization || 0}%</span>
                    </div>
                  </td>
                  {user.role === 'admin' && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">
                        {crane.managerName || 'Unassigned'}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">
                      {crane.operatorNames || 'Unassigned'}
                    </div>
                  </td>
                  {(user.role === 'admin' || user.role === 'manager') && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">
                        {crane.supervisorNames || 'Unassigned'}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">
                    {crane.lastSeen 
                      ? new Date(crane.lastSeen).toLocaleString()
                      : 'Never'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-primary-600 hover:text-primary-900 group-hover:scale-105 transition-transform duration-300">
                        View
                      </button>
                      {(user.role === 'admin' || user.role === 'manager') && (
                        <>
                          {user.role === 'manager' && (
                            <button 
                              onClick={() => handleAssignSupervisors(crane)}
                              className="text-blue-600 hover:text-blue-900 group-hover:scale-105 transition-transform duration-300"
                            >
                              Assign
                            </button>
                          )}
                          <button 
                            onClick={async () => {
                              if (confirm('Are you sure you want to delete this crane?')) {
                                try {
                                  await cranesAPI.delete(crane.craneId);
                                  toast.success('Crane deleted successfully');
                                  refetch();
                                } catch (error) {
                                  toast.error('Failed to delete crane');
                                }
                              }
                            }}
                            className="text-red-600 hover:text-red-900 group-hover:scale-105 transition-transform duration-300"
                          >
                            Delete
                          </button>
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

      {filteredCranes.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No cranes found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'No cranes have been added to the system yet.'
            }
          </p>
        </div>
      )}

      {/* Supervisor Assignment Modal */}
      {assigningCrane && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setAssigningCrane(null)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Assign Supervisors to {assigningCrane.name}
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="form-label">Select Supervisors</label>
                        <select
                          multiple
                          className="form-input h-32"
                          value={selectedSupervisors}
                          onChange={(e) => {
                            const values = Array.from(e.target.selectedOptions, option => option.value);
                            setSelectedSupervisors(values);
                          }}
                        >
                          {supervisorsData?.data?.users?.map((supervisor) => (
                            <option key={supervisor._id} value={supervisor._id}>
                              {supervisor.name} ({supervisor.email})
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Hold Ctrl (or Cmd on Mac) to select multiple supervisors
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleSaveAssignment}
                  className="btn-primary w-full sm:w-auto sm:ml-3"
                >
                  Assign Supervisors
                </button>
                <button
                  onClick={() => setAssigningCrane(null)}
                  className="btn-outline w-full sm:w-auto mt-3 sm:mt-0"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
