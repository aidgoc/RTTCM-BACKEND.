import { useState } from 'react';
import { useQuery } from 'react-query';
import { ticketsAPI } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';

export default function Tickets() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    status: 'all',
    severity: 'all',
    type: 'all',
  });

  const { data, isLoading } = useQuery(
    ['tickets', filters],
    () => ticketsAPI.getAll(filters),
    {
      refetchInterval: 10000, // Auto-refresh every 10 seconds
      refetchIntervalInBackground: true,
    }
  );

  const allTickets = data?.data?.tickets || [];

  // Filter tickets based on user role and assignments
  const tickets = allTickets.filter(ticket => {
    if (user.role === 'admin') {
      // Admin can see all tickets
      return true;
    } else if (user.role === 'manager') {
      // Manager can only see tickets for cranes assigned to them
      return user.assignedCranes && user.assignedCranes.includes(ticket.craneId);
    } else if (user.role === 'operator') {
      // Operator can only see tickets for cranes assigned to them
      return user.assignedCranes && user.assignedCranes.includes(ticket.craneId);
    }
    return false;
  });

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical':
        return <span className="status-critical">Critical</span>;
      case 'warning':
        return <span className="status-warning">Warning</span>;
      case 'info':
        return <span className="status-normal">Info</span>;
      default:
        return <span className="status-normal">{severity}</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return <span className="status-warning">Open</span>;
      case 'in_progress':
        return <span className="status-normal">In Progress</span>;
      case 'closed':
        return <span className="status-offline">Closed</span>;
      default:
        return <span className="status-normal">{status}</span>;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'overload':
        return '⚠️';
      case 'limit_switch':
        return '🔧';
      case 'offline':
        return '📴';
      case 'utilization':
        return '📊';
      case 'manual':
        return '✋';
      default:
        return '📋';
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tickets</h1>
          <p className="text-gray-600 dark:text-gray-300">Monitor and manage system alerts</p>
        </div>
        
        {user.role !== 'operator' && (
          <button className="btn-primary">
            Create Ticket
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card hover:shadow-lg hover:border-cyan-400/60 dark:hover:border-cyan-500/60 transition-all duration-300">
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Status</label>
              <select
                className="form-input"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="form-label">Severity</label>
              <select
                className="form-input"
                value={filters.severity}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
              >
                <option value="all">All Severity</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>
            <div>
              <label className="form-label">Type</label>
              <select
                className="form-input"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="all">All Types</option>
                <option value="overload">Overload</option>
                <option value="limit_switch">Limit Switch</option>
                <option value="offline">Offline</option>
                <option value="utilization">Utilization</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {tickets.map((ticket) => (
          <div key={ticket._id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg hover:shadow-2xl hover:scale-[1.02] hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300 cursor-pointer group relative overflow-hidden">
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="text-2xl group-hover:scale-110 transition-transform duration-300">
                    {getTypeIcon(ticket.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors duration-300">
                        {ticket.message}
                      </h3>
                      {getSeverityBadge(ticket.severity)}
                      {getStatusBadge(ticket.status)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-2 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
                      <span className="font-medium">Crane:</span> {ticket.craneId} • 
                      <span className="font-medium ml-1">Type:</span> {ticket.type.replace('_', ' ')} • 
                      <span className="font-medium ml-1">Created:</span> {new Date(ticket.createdAt).toLocaleString()}
                    </div>
                    {ticket.resolution && (
                      <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-md group-hover:bg-gray-100 dark:group-hover:bg-gray-600 transition-colors duration-300">
                        <span className="font-medium">Resolution:</span> {ticket.resolution}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="btn-outline text-xs px-3 py-1 group-hover:scale-105 transition-transform duration-300">
                    View
                  </button>
                  {user.role !== 'operator' && (
                    <>
                      {ticket.status === 'open' && (
                        <button className="btn-primary text-xs px-3 py-1 group-hover:scale-105 transition-transform duration-300">
                          Assign
                        </button>
                      )}
                      {ticket.status === 'in_progress' && (
                        <button className="btn-success text-xs px-3 py-1 group-hover:scale-105 transition-transform duration-300">
                          Close
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {tickets.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No tickets found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {Object.values(filters).some(f => f !== 'all')
              ? 'Try adjusting your filter criteria.'
              : 'No tickets have been created yet.'
            }
          </p>
        </div>
      )}
    </div>
  );
}
