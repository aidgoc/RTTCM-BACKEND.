import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useSocket } from '../src/lib/socket';
import { useMQTTStatus } from '../src/hooks/useMQTTStatus';
import { cranesAPI, ticketsAPI, craneAssignmentAPI, usersAPI } from '../src/lib/api';
import CraneCard from '../src/components/CraneCard';
import FleetSummary from '../src/components/FleetSummary';
import CraneCardModal from '../src/components/CraneCardModal';
import CraneForm from '../src/components/forms/CraneForm';
import AlarmManager from '../src/components/AlarmManager';
import TestResultsViewer from '../src/components/TestModeInterface';
import PendingCranesManager from '../src/components/PendingCranesManager';
import MapView from '../src/components/MapView';
import { useAuth } from '../src/lib/auth';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user, loading, canCreateCranes, checkAuth } = useAuth();
  const { 
    connected: wsConnected,
    subscribeToAllTelemetry,
    subscribeToAllTickets,
    subscribeToCraneCreated,
    subscribeToCraneUpdated,
    subscribeToCraneApproved
  } = useSocket();
  const { connected: mqttConnected } = useMQTTStatus();
  const queryClient = useQueryClient();
  const [cranes, setCranes] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [assigningCrane, setAssigningCrane] = useState(null);
  const [selectedOperators, setSelectedOperators] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [selectedCrane, setSelectedCrane] = useState(null);
  const [showCraneCard, setShowCraneCard] = useState(false);
  const [showCraneForm, setShowCraneForm] = useState(false);
  const [editingCrane, setEditingCrane] = useState(null);
  const [showTestMode, setShowTestMode] = useState(false);
  const [testCraneId, setTestCraneId] = useState(null);
  const [showPendingCranes, setShowPendingCranes] = useState(false);
  const [isMapView, setIsMapView] = useState(false);

  // Show loading state while user data is being fetched
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-4 border-cyan-500/30 border-t-cyan-400"></div>
      </div>
    );
  }

  // Client-side role redirects to avoid SSR router usage
  useEffect(() => {
    if (typeof window === 'undefined' || !user) return;
    if (user.role === 'superadmin') window.location.href = '/superadmin';
    if (user.role === 'supervisor') window.location.href = '/supervisor';
    if (user.role === 'operator') window.location.href = '/operator';
  }, [user]);

  // Fetch cranes data with 10-second refresh
  const { data: cranesData, isLoading: cranesLoading, refetch: refetchCranes } = useQuery(
    'cranes',
    () => cranesAPI.getAll({ limit: 50 }),
    {
      onSuccess: (data) => {
        const allCranes = data.data.cranes || [];
        console.log('Fetched cranes from server:', allCranes.length, 'cranes');
        console.log('User assignedCranes:', user?.assignedCranes);
        
        // Filter cranes based on user role and assignments (new RBAC structure)
        const filteredCranes = allCranes.filter(crane => {
          // Only show active cranes
          if (!crane.isActive) {
            console.log(`Crane ${crane.craneId} filtered out: not active`);
            return false;
          }
          
          if (user?.role === 'admin') {
            // Admin can see all active cranes
            console.log(`Crane ${crane.craneId} included: admin can see all`);
            return true;
          } else if (user?.role === 'manager') {
            // Manager can see all active cranes they manage
            const canSee = user?.assignedCranes && user?.assignedCranes.includes(crane.craneId);
            console.log(`Crane ${crane.craneId} manager check:`, canSee, 'assignedCranes:', user?.assignedCranes);
            return canSee;
          } else if (user?.role === 'supervisor') {
            // Supervisor can only see active cranes assigned by manager
            const canSee = user?.assignedCranes && user?.assignedCranes.includes(crane.craneId);
            console.log(`Crane ${crane.craneId} supervisor check:`, canSee);
            return canSee;
          } else if (user?.role === 'operator') {
            // Operator can only see active cranes assigned by supervisor
            const canSee = user?.assignedCranes && user?.assignedCranes.includes(crane.craneId);
            console.log(`Crane ${crane.craneId} operator check:`, canSee);
            return canSee;
          }
          return false;
        });
        
        console.log('Filtered cranes:', filteredCranes.length, 'cranes');
        
        setCranes(filteredCranes);
        setLastRefresh(new Date());
      },
      refetchInterval: 10000, // Refetch every 10 seconds
      refetchIntervalInBackground: true, // Continue refetching when tab is not active
    }
  );

  // Fetch tickets data with 10-second refresh
  const { data: ticketsData, isLoading: ticketsLoading } = useQuery(
    'tickets',
    () => ticketsAPI.getStats(),
    {
      refetchInterval: 10000, // Refetch every 10 seconds
      refetchIntervalInBackground: true, // Continue refetching when tab is not active
    }
  );

  // Fetch operators for supervisor assignment
  const { data: operatorsData } = useQuery(
    'operators',
    () => usersAPI.getAll({ role: 'operator' }),
    {
      enabled: user?.role === 'supervisor',
    }
  );


  // Handle crane assignment to operators
  const handleAssignCrane = (crane) => {
    setAssigningCrane(crane);
    setSelectedOperators([]);
  };

  const handleSaveAssignment = async () => {
    if (!assigningCrane || selectedOperators.length === 0) return;

    try {
      await craneAssignmentAPI.assignToOperator({
        operatorId: selectedOperators[0], // For now, assign to first selected operator
        craneIds: [assigningCrane.craneId]
      });

      toast.success('Crane assigned to operator successfully!');
      setAssigningCrane(null);
      setSelectedOperators([]);
      refetchCranes(); // Refresh crane data
    } catch (error) {
      toast.error('Failed to assign crane to operator');
      console.error('Assignment error:', error);
    }
  };


  const handleAddCrane = () => {
    setEditingCrane(null);
    setShowCraneForm(true);
  };

  const handleEditCrane = (crane) => {
    setEditingCrane(crane);
    setShowCraneForm(true);
  };

  const handleCraneFormSubmit = async (formData) => {
    try {
      let newCrane;
      if (editingCrane) {
        // Update existing crane
        const response = await cranesAPI.update(editingCrane.craneId, formData);
        newCrane = response.data.crane;
        toast.success('Crane updated successfully');
      } else {
        // Create new crane
        const response = await cranesAPI.create(formData);
        newCrane = response.data.crane;
        toast.success('Crane created successfully');
      }
      
      setShowCraneForm(false);
      setEditingCrane(null);
      
      // For new cranes, add to local state immediately
      if (!editingCrane && newCrane) {
        console.log('Adding new crane to local state:', newCrane);
        console.log('Current cranes count before adding:', cranes.length);
        
        setCranes(prevCranes => {
          // Check if crane already exists to avoid duplicates
          const exists = prevCranes.some(crane => crane.craneId === newCrane.craneId);
          if (!exists) {
            console.log('New crane added to local state successfully');
            // Add new crane at the beginning (most recent first)
            const newCranes = [newCrane, ...prevCranes];
            console.log('New cranes count after adding:', newCranes.length);
            return newCranes;
          }
          console.log('Crane already exists in local state');
          return prevCranes;
        });
      }
      
      // Invalidate and refetch all queries
      console.log('Invalidating and refreshing all queries...');
      try {
        // Invalidate all queries to force fresh data
        await queryClient.invalidateQueries();
        
        // Force refetch cranes data
        await refetchCranes();
        setLastRefresh(new Date());
        console.log('Cranes data refreshed from server successfully');
        
        // Also refresh user data to get updated assignedCranes
        console.log('Refreshing user data to get updated assignedCranes...');
        await checkAuth();
        console.log('User data refreshed');
      } catch (error) {
        console.error('Error refreshing cranes from server:', error);
        // Even if server refresh fails, the local state should still show the new crane
      }
    } catch (error) {
      console.error('Crane form submission error:', error);
      toast.error(error.response?.data?.error || 'Failed to save crane');
    }
  };

  const handleCraneFormCancel = () => {
    setShowCraneForm(false);
    setEditingCrane(null);
  };

  // Handle analytics click - navigate to analytics page
  const handleAnalyticsClick = (crane) => {
    console.log('Analytics clicked for crane:', crane?.craneId);
    // Store selected crane in sessionStorage for analytics page
    sessionStorage.setItem('selectedCraneId', crane.craneId);
    if (typeof window !== 'undefined') window.location.href = '/analytics';
  };

  // Close modals
  const handleCloseModals = () => {
    setShowCraneCard(false);
    setSelectedCrane(null);
  };

  // Test mode handlers
  const handleOpenTestMode = (craneId) => {
    setTestCraneId(craneId);
    setShowTestMode(true);
  };

  const handleCloseTestMode = () => {
    setShowTestMode(false);
    setTestCraneId(null);
  };

  const handleCraneApproved = (crane) => {
    console.log('Crane approved:', crane);
    // Refresh cranes data
    refetchCranes();
    toast.success(`Crane ${crane.craneId} has been approved and is now active`);
  };

  // Set global function for crane cards
  useEffect(() => {
    window.openTestResults = handleOpenTestMode;
    return () => {
      delete window.openTestResults;
    };
  }, []);

  // WebSocket subscriptions
  useEffect(() => {
    if (!wsConnected) return;

    const unsubscribeTelemetry = subscribeToAllTelemetry((data) => {
      // Update crane data in real-time
      setCranes(prevCranes => 
        prevCranes.map(crane => 
          crane.craneId === data.craneId 
            ? { ...crane, lastStatusRaw: data.data, lastSeen: new Date(data.timestamp) }
            : crane
        )
      );
      
      // Show toast for critical alerts
      if (data.data.load > data.data.swl) {
        toast.error(`Crane ${data.craneId} overload detected!`);
      }
    });

    const unsubscribeTickets = subscribeToAllTickets((data) => {
      // Refresh tickets data when new tickets are created
      refetchCranes();
      toast.error(`New ${data.ticket.severity} alert: ${data.ticket.message}`);
    });

    const unsubscribeCraneCreated = subscribeToCraneCreated((data) => {
      console.log('New crane created via WebSocket:', data);
      
      // Check if the user can see this crane based on their role and assignments
      const canSeeCrane = () => {
        if (user?.role === 'admin') return true;
        if (user?.role === 'manager' || user?.role === 'supervisor' || user?.role === 'operator') {
          return user?.assignedCranes && user?.assignedCranes.includes(data.crane.craneId);
        }
        return false;
      };

      if (canSeeCrane()) {
        // Add the new crane to local state immediately
        setCranes(prevCranes => {
          const exists = prevCranes.some(crane => crane.craneId === data.crane.craneId);
          if (!exists) {
            console.log('Adding new crane from WebSocket to local state:', data.crane);
            return [data.crane, ...prevCranes];
          }
          return prevCranes;
        });
        
        // Show success toast
        toast.success(`New crane ${data.crane.craneId} added successfully!`);
      }
    });

    const unsubscribeCraneUpdated = subscribeToCraneUpdated((data) => {
      console.log('Crane updated via WebSocket:', data);
      
      // Check if the user can see this crane
      const canSeeCrane = () => {
        if (user?.role === 'admin') return true;
        if (user?.role === 'manager' || user?.role === 'supervisor' || user?.role === 'operator') {
          return user?.assignedCranes && user?.assignedCranes.includes(data.crane.craneId);
        }
        return false;
      };

      if (canSeeCrane()) {
        // Update the crane in local state
        setCranes(prevCranes => 
          prevCranes.map(crane => 
            crane.craneId === data.crane.craneId ? data.crane : crane
          )
        );
        
        // Show info toast
        toast.success(`Crane ${data.crane.craneId} updated successfully!`);
      }
    });

    const unsubscribeCraneApproved = subscribeToCraneApproved((data) => {
      console.log('Crane approved via WebSocket:', data);
      
      // Check if the user can see this crane
      const canSeeCrane = () => {
        if (user?.role === 'admin') return true;
        if (user?.role === 'manager' || user?.role === 'supervisor' || user?.role === 'operator') {
          return user?.assignedCranes && user?.assignedCranes.includes(data.craneId);
        }
        return false;
      };

      if (canSeeCrane()) {
        // Add the approved crane to local state
        setCranes(prevCranes => {
          const exists = prevCranes.some(crane => crane.craneId === data.craneId);
          if (!exists) {
            console.log('Adding approved crane from WebSocket to local state:', data.crane);
            return [data.crane, ...prevCranes];
          }
          return prevCranes;
        });
        
        // Show success toast
        toast.success(`Crane ${data.craneId} approved and activated!`);
      }
    });

    return () => {
      unsubscribeTelemetry();
      unsubscribeTickets();
      unsubscribeCraneCreated();
      unsubscribeCraneUpdated();
      unsubscribeCraneApproved();
    };
  }, [wsConnected, refetchCranes, subscribeToAllTelemetry, subscribeToAllTickets, subscribeToCraneCreated, subscribeToCraneUpdated, subscribeToCraneApproved]);

  // Calculate fleet summary
  const fleetSummary = {
    totalCranes: cranes.length,
    onlineCranes: cranes.filter(crane => crane.online).length,
    activeAlerts: ticketsData?.data?.summary?.open || 0,
    avgUtilization: cranes.length > 0 
      ? Math.round(cranes.reduce((sum, crane) => sum + (crane.utilization || 0), 0) / cranes.length)
      : 0,
  };

  if (cranesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {/* Dashboard title and description hidden as per user request */}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Sync Telemetry Button (Admin only) */}
          {user?.role === 'admin' && (
            <button
              onClick={async () => {
                if (syncing) return;
                setSyncing(true);
                try {
                  const response = await cranesAPI.syncTelemetry();
                  toast.success(`Telemetry synced! Updated ${response.data.updatedCount} cranes`);
                  refetchCranes();
                } catch (error) {
                  console.error('Sync error:', error);
                  toast.error(`Sync failed: ${error.response?.data?.error || error.message}`);
                } finally {
                  setSyncing(false);
                }
              }}
              disabled={syncing}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                syncing 
                  ? 'bg-gray-500 text-gray-300 cursor-not-allowed' 
                  : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/50'
              }`}
            >
              {syncing ? '⏳' : '🔄'} {syncing ? 'Syncing...' : 'Sync'}
            </button>
          )}
          
          {/* Connection status */}
          <div className={`flex items-center space-x-3 px-4 py-2 rounded-full text-sm font-semibold ${
            user?.role === 'operator' 
              ? `shadow-md ${mqttConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`
              : `shadow-lg ${mqttConnected 
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-green-500/50' 
                : 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-red-500/50'}`
          }`}>
            <div className={`w-3 h-3 rounded-full ${
              mqttConnected ? 'bg-green-300 animate-pulse' : 'bg-red-300'
            }`}></div>
            <span>{mqttConnected ? 'MQTT Connected' : 'MQTT Disconnected'}</span>
          </div>
          
        </div>
      </div>

      {/* Fleet Summary Cards - Only show for Admin and Manager */}
      {user?.role !== 'operator' && <FleetSummary data={fleetSummary} />}

      {/* Cranes Display - Map for Managers/Admins, Cards for Operators */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            {user?.role === 'operator' ? 'Assigned Cranes' : 'Crane Locations'}
          </h2>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {cranes.length} crane{cranes.length !== 1 ? 's' : ''}
            </div>
            {/* Map/List Toggle - Only for non-operators */}
            {user?.role !== 'operator' && (
              <button
                onClick={() => setIsMapView(!isMapView)}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                {isMapView ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    <span>List View</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <span>Map View</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {cranes.length === 0 ? (
          <div className="space-y-6">
            {/* Show different content based on user role */}
            {(user?.role === 'manager' || user?.role === 'admin' || user?.role === 'supervisor') && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="text-center">
                  <div className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {user?.role === 'operator' 
                      ? 'No Assigned Cranes'
                      : 'No Cranes Found'
                    }
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    {user?.role === 'operator' 
                      ? 'You are not assigned to any cranes yet.'
                      : user?.role === 'admin'
                      ? 'No cranes have been added to the system yet. Check for pending cranes that need approval.'
                      : 'No cranes have been added to the system yet. Add your first crane to get started!'
                    }
                  </p>
                  
                  {/* Role-based buttons */}
                  {user?.role !== 'operator' && (
                    <div className="flex flex-wrap justify-center gap-3">
                      {/* Only managers can add cranes */}
                      {canCreateCranes() && (
                        <button
                          onClick={handleAddCrane}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 hover:scale-105 shadow-lg"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span>Add Your First Crane</span>
                        </button>
                      )}
                      
                      {/* All non-operators can check pending cranes */}
                      <button
                        onClick={() => setShowPendingCranes(true)}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 hover:scale-105 shadow-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span>Check Pending Cranes</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Show empty state for operators */}
            {user?.role === 'operator' && (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No assigned cranes</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  You are not assigned to any cranes yet. Contact your supervisor for crane assignments.
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Show Map View for non-operators, Cards for operators */}
            {user?.role === 'operator' ? (
              // Operator view - always show cards
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {cranes.map((crane) => (
                    <CraneCard 
                      key={crane.craneId} 
                      crane={crane} 
                      userRole={user?.role}
                      onAssign={user?.role === 'supervisor' ? handleAssignCrane : null}
                    />
                  ))}
                </div>
              </div>
            ) : (
              // Manager/Admin/Supervisor view - toggle between map and list
              <div className="space-y-6">
                {/* Add Crane button for managers and admins */}
                {canCreateCranes() && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                          Crane Management
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Add new cranes to the system
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={handleAddCrane}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1 hover:scale-105"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span>Add Crane</span>
                        </button>
                        <button
                          onClick={() => setShowPendingCranes(true)}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1 hover:scale-105"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span>Pending Cranes</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Map or List View */}
                {isMapView ? (
                  <MapView
                    cranes={cranes}
                    onCraneClick={(crane) => {
                      setSelectedCrane(crane);
                      setShowCraneCard(true);
                    }}
                    isListView={false}
                    onToggleView={() => setIsMapView(!isMapView)}
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {cranes.map((crane) => (
                      <CraneCard 
                        key={crane.craneId} 
                        crane={crane} 
                        userRole={user?.role}
                        onAssign={user?.role === 'supervisor' ? handleAssignCrane : null}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Recent Activity - Only show for Admin and Manager */}
      {user?.role !== 'operator' && ticketsData?.data?.recentTickets && ticketsData.data.recentTickets.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-600 rounded-xl shadow-lg hover:shadow-2xl hover:border-cyan-400/60 dark:hover:border-cyan-400/60 transition-all duration-300 group overflow-hidden">
          <div className="px-6 py-5 sm:px-8 border-b border-cyan-500/20 dark:border-cyan-400/20 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/20 dark:to-blue-500/20">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors duration-300">Recent Alerts</h3>
          </div>
          <div className="px-6 py-6 sm:p-8">
            <div className="space-y-3">
              {ticketsData.data.recentTickets.slice(0, 5).map((ticket) => (
                <div key={ticket._id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0 group-hover:bg-gray-50 dark:group-hover:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-300 rounded px-2 -mx-2">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full transition-all duration-300 group-hover:scale-125 ${
                      ticket.severity === 'critical' ? 'bg-red-400 group-hover:bg-red-500 dark:bg-red-500 dark:group-hover:bg-red-400' :
                      ticket.severity === 'warning' ? 'bg-yellow-400 group-hover:bg-yellow-500 dark:bg-yellow-500 dark:group-hover:bg-yellow-400' :
                      'bg-blue-400 group-hover:bg-blue-500 dark:bg-blue-500 dark:group-hover:bg-blue-400'
                    }`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">{ticket.message}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-500 transition-colors duration-300">Crane {ticket.craneId}</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors duration-300">
                    {new Date(ticket.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Crane Assignment Modal for Supervisors */}
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
                      Assign Crane to Operator
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Assigning: <strong>{assigningCrane.name}</strong>
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="form-label">Select Operator</label>
                        <select
                          className="form-input"
                          value={selectedOperators[0] || ''}
                          onChange={(e) => setSelectedOperators([e.target.value])}
                        >
                          <option value="">Choose an operator...</option>
                          {operatorsData?.data?.users?.map((operator) => (
                            <option key={operator._id} value={operator._id}>
                              {operator.name} ({operator.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleSaveAssignment}
                  disabled={selectedOperators.length === 0}
                  className="btn-primary w-full sm:w-auto sm:ml-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Assign Crane
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

      {/* Crane Card Modal */}
      <CraneCardModal
        crane={selectedCrane}
        isOpen={showCraneCard}
        onClose={handleCloseModals}
        onAnalyticsClick={handleAnalyticsClick}
      />

      {/* Crane Form Modal */}
      {showCraneForm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCraneFormCancel();
            }
          }}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
            style={{ zIndex: 100000 }}
          >
            {/* Close button */}
            <button
              onClick={handleCraneFormCancel}
              className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <CraneForm
              onSubmit={handleCraneFormSubmit}
              onCancel={handleCraneFormCancel}
              initialData={editingCrane}
              isEditing={!!editingCrane}
            />
          </div>
        </div>
      )}

      {/* Alarm Manager */}
      <AlarmManager />

      {/* Test Results Viewer */}
      {showTestMode && testCraneId && (
        <TestResultsViewer
          craneId={testCraneId}
          onClose={handleCloseTestMode}
        />
      )}

      {/* Pending Cranes Discovery */}
      {showPendingCranes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Pending Cranes Discovery
                </h2>
                <button
                  onClick={() => setShowPendingCranes(false)}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <PendingCranesManager onCraneApproved={handleCraneApproved} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
