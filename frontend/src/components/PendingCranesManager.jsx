import React, { useState, useEffect } from 'react';
import { useSocket } from '../lib/socket';
import { cranesAPI } from '../lib/api';
import { 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ClockIcon,
  MapPinIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const PendingCranesManager = ({ onCraneApproved }) => {
  const [pendingCranes, setPendingCranes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCrane, setSelectedCrane] = useState(null);
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const { socket } = useSocket();

  // Fetch pending cranes
  const fetchPendingCranes = async () => {
    try {
      setLoading(true);
      const response = await cranesAPI.getPendingCranes();
      setPendingCranes(response.pendingCranes || []);
    } catch (error) {
      console.error('Error fetching pending cranes:', error);
      toast.error('Failed to fetch pending cranes');
    } finally {
      setLoading(false);
    }
  };

  // Listen for discovery events
  useEffect(() => {
    if (!socket) return;

    const handleCraneDiscovered = (data) => {
      console.log('New crane discovered:', data);
      toast.success(`New crane discovered: ${data.craneId}`);
      fetchPendingCranes(); // Refresh the list
    };

    const handleCraneApproved = (data) => {
      console.log('Crane approved:', data);
      toast.success(`Crane ${data.craneId} approved and activated`);
      fetchPendingCranes(); // Refresh the list
      onCraneApproved?.(data.crane);
    };

    const handleCraneRejected = (data) => {
      console.log('Crane rejected:', data);
      toast.error(`Crane ${data.craneId} rejected: ${data.reason}`);
      fetchPendingCranes(); // Refresh the list
    };

    socket.on('crane:discovered', handleCraneDiscovered);
    socket.on('crane:approved', handleCraneApproved);
    socket.on('crane:rejected', handleCraneRejected);

    return () => {
      socket.off('crane:discovered', handleCraneDiscovered);
      socket.off('crane:approved', handleCraneApproved);
      socket.off('crane:rejected', handleCraneRejected);
    };
  }, [socket, onCraneApproved]);

  // Initial fetch
  useEffect(() => {
    fetchPendingCranes();
  }, []);

  const handleApprove = (crane) => {
    setSelectedCrane(crane);
    setShowApprovalForm(true);
  };

  const handleReject = async (craneId) => {
    if (!confirm('Are you sure you want to reject this crane?')) return;

    try {
      await cranesAPI.rejectPendingCrane(craneId, 'Rejected by admin');
      toast.success('Crane rejected');
      fetchPendingCranes();
    } catch (error) {
      console.error('Error rejecting crane:', error);
      toast.error('Failed to reject crane');
    }
  };

  const handleApprovalSubmit = async (formData) => {
    try {
      await cranesAPI.approvePendingCrane(selectedCrane.craneId, formData);
      toast.success('Crane approved and activated');
      setShowApprovalForm(false);
      setSelectedCrane(null);
      fetchPendingCranes();
    } catch (error) {
      console.error('Error approving crane:', error);
      toast.error('Failed to approve crane');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (pendingCranes.length === 0) {
    return (
      <div className="text-center py-8">
        <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No Pending Cranes</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          No new cranes have been discovered from MQTT data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Pending Cranes ({pendingCranes.length})
        </h3>
        <button
          onClick={fetchPendingCranes}
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pendingCranes.map((crane) => (
          <div key={crane.craneId} className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    {crane.name}
                  </h4>
                </div>
                
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-1">
                    <span className="font-medium">ID:</span>
                    <span className="font-mono">{crane.craneId}</span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <MapPinIcon className="h-3 w-3" />
                    <span>{crane.location}</span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <span className="font-medium">SWL:</span>
                    <span>{crane.swl}kg</span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <ClockIcon className="h-3 w-3" />
                    <span>Discovered: {new Date(crane.discoveredAt).toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <span className="font-medium">Telemetry:</span>
                    <span>{crane.telemetryCount} messages</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex space-x-2">
              <button
                onClick={() => handleApprove(crane)}
                className="flex-1 bg-green-600 text-white text-xs px-3 py-1 rounded hover:bg-green-700 transition-colors"
              >
                <CheckCircleIcon className="h-3 w-3 inline mr-1" />
                Approve
              </button>
              <button
                onClick={() => handleReject(crane.craneId)}
                className="flex-1 bg-red-600 text-white text-xs px-3 py-1 rounded hover:bg-red-700 transition-colors"
              >
                <XCircleIcon className="h-3 w-3 inline mr-1" />
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Approval Form Modal */}
      {showApprovalForm && selectedCrane && (
        <ApprovalForm
          crane={selectedCrane}
          onSubmit={handleApprovalSubmit}
          onCancel={() => {
            setShowApprovalForm(false);
            setSelectedCrane(null);
          }}
        />
      )}
    </div>
  );
};

// Approval Form Component
const ApprovalForm = ({ crane, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: crane.name,
    location: crane.location,
    swl: crane.swl,
    managerUserId: '',
    operators: [],
    assignedSupervisors: []
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Approve Crane: {crane.craneId}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Crane Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Safe Working Load (kg)
            </label>
            <input
              type="number"
              value={formData.swl}
              onChange={(e) => setFormData({...formData, swl: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Approve & Activate
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PendingCranesManager;
