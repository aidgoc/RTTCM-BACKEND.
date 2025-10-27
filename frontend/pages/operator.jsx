import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { cranesAPI } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';
import CraneCard from '../src/components/CraneCard';
import TicketForm from '../src/components/TicketForm';
import TicketList from '../src/components/TicketList';
import toast from 'react-hot-toast';

export default function Operator() {
  const { user, checkAuth } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [selectedCrane, setSelectedCrane] = useState(null);
  const [activeTab, setActiveTab] = useState('cranes'); // 'cranes' or 'tickets'

  // Refresh user data on component mount
  useEffect(() => {
    if (user?.role === 'operator') {
      checkAuth();
    }
  }, [user?.role]);

  // Fetch cranes assigned to operator
  const { data: cranesData, isLoading: cranesLoading, refetch: refetchCranes } = useQuery(
    'operator-cranes',
    () => cranesAPI.getAll({ limit: 100 }),
    {
      enabled: Boolean(user && user.role === 'operator'),
      refetchInterval: 30000,
    }
  );

  // Filter cranes based on user's assigned cranes
  const allCranes = cranesData?.data?.cranes || [];
  
  // Debug logging
  console.log('Operator Debug - User:', user);
  console.log('Operator Debug - All cranes:', allCranes);
  console.log('Operator Debug - User assignedCranes:', user?.assignedCranes);
  
  const cranes = allCranes.filter(crane => 
    user?.assignedCranes?.includes(crane.craneId) &&
    (searchTerm === '' || 
     crane.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     crane.craneId.toLowerCase().includes(searchTerm.toLowerCase()) ||
     crane.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  console.log('Operator Debug - Filtered cranes:', cranes);

  // Handle ticket creation
  const handleCreateTicket = (craneId) => {
    setSelectedCrane(craneId);
    setShowTicketForm(true);
  };

  const handleTicketCreated = (ticket) => {
    toast.success('Ticket created successfully!');
    // Refresh tickets if on tickets tab
    if (activeTab === 'tickets') {
      queryClient.invalidateQueries('tickets');
    }
  };

  if (!user || user.role !== 'operator') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            This page is only accessible to operators.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Operator Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Welcome back, {user.name}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {user.role.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('cranes')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'cranes'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              My Cranes ({cranes.length})
            </button>
            <button
              onClick={() => setActiveTab('tickets')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tickets'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              My Tickets
            </button>
          </nav>
        </div>

        {/* Cranes Tab */}
        {activeTab === 'cranes' && (
          <div className="space-y-6">
            {/* Search and Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex-1 max-w-lg">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search cranes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Cranes Grid */}
            {cranesLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : cranes.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 dark:text-gray-500">
                  <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <p className="text-lg font-medium">No cranes assigned</p>
                  <p className="text-sm">You haven't been assigned any cranes yet.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {cranes.map((crane) => (
                  <div key={crane.craneId} className="relative">
                    <CraneCard 
                      crane={crane} 
                      userRole="operator"
                    />
                    {/* Ticket Creation Button */}
                    <div className="mt-4 flex justify-center">
                      <button
                        onClick={() => handleCreateTicket(crane.craneId)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        Report Problem
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tickets Tab */}
        {activeTab === 'tickets' && (
          <div>
            <TicketList />
          </div>
        )}
      </div>

      {/* Ticket Creation Modal */}
      <TicketForm
        isOpen={showTicketForm}
        onClose={() => {
          setShowTicketForm(false);
          setSelectedCrane(null);
        }}
        onSuccess={handleTicketCreated}
        craneId={selectedCrane}
      />
    </div>
  );
}
