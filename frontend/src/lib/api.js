import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Token is handled by httpOnly cookies, no need to add manually
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors gracefully
    if (!error.response) {
      console.warn('API connection error - backend might be unavailable');
      // Don't reject for network errors in production to prevent crashes
      if (process.env.NODE_ENV === 'production') {
        return Promise.resolve({ data: null, error: 'Network error' });
      }
    }
    
    if (error.response?.status === 401) {
      // Redirect to login on unauthorized
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  signup: (userData) => api.post('/api/auth/signup', userData),
  logout: () => api.post('/api/auth/logout'),
  me: () => api.get('/api/auth/me'),
  refresh: () => api.post('/api/auth/refresh'),
};

// Cranes API
export const cranesAPI = {
  getAll: (params = {}) => api.get('/api/cranes', { params }),
  getById: (id) => api.get(`/api/cranes/${id}`),
  create: (data) => api.post('/api/cranes', data),
  update: (id, data) => api.patch(`/api/cranes/${id}`, data),
  delete: (id) => api.delete(`/api/cranes/${id}`),
  updateLocation: (id, locationData) => api.patch(`/api/cranes/${id}/location`, locationData),
  getTelemetry: (id, params = {}) => api.get(`/api/cranes/${id}/telemetry`, { params }),
  getTelemetryStats: (id, params = {}) => api.get(`/api/cranes/${id}/telemetry/stats`, { params }),
  getTickets: (id, params = {}) => api.get(`/api/cranes/${id}/tickets`, { params }),
  syncTelemetry: () => api.post('/api/cranes/sync-telemetry'),
  // Pending cranes (discovery)
  getPendingCranes: () => api.get('/api/cranes/pending'),
  approvePendingCrane: (craneId, craneData) => api.post(`/api/cranes/pending/${craneId}/approve`, craneData),
  rejectPendingCrane: (craneId, reason) => api.post(`/api/cranes/pending/${craneId}/reject`, { reason }),
};

// Tickets API
export const ticketsAPI = {
  getAll: (params = {}) => api.get('/api/tickets', { params }),
  getById: (id) => api.get(`/api/tickets/${id}`),
  create: (data) => api.post('/api/tickets', data),
  update: (id, data) => api.patch(`/api/tickets/${id}`, data),
  getStats: (params = {}) => api.get('/api/tickets/stats/summary', { params }),
};

// Users API
export const usersAPI = {
  getAll: (params = {}) => api.get('/api/users', { params }),
  getById: (id) => api.get(`/api/users/${id}`),
  create: (data) => api.post('/api/users', data),
  update: (id, data) => api.patch(`/api/users/${id}`, data),
  delete: (id) => api.delete(`/api/users/${id}`),
  getStats: () => api.get('/api/users/stats/summary'),
};

// Settings API
export const settingsAPI = {
  getSettings: () => api.get('/api/settings'),
  updateSettings: (data) => api.put('/api/settings', data),
  getSystemStatus: () => api.get('/api/settings/system-status'),
  getUsers: () => api.get('/api/settings/users'),
};

// Simulation API
export const simulationAPI = {
  publish: (data) => api.post('/api/sim/publish', data),
  publishBatch: (data) => api.post('/api/sim/publish/batch', data),
  getSamples: () => api.get('/api/sim/samples'),
  generate: (data) => api.post('/api/sim/generate', data),
};

// Health check
export const healthAPI = {
  check: () => api.get('/health'),
};

// Crane Assignment API
export const craneAssignmentAPI = {
  assignToOperator: (data) => api.post('/api/crane-assignments/assign-to-operator', data),
  assignToSupervisor: (data) => api.post('/api/crane-assignments/assign-to-supervisor', data),
  getAssignments: (params = {}) => api.get('/api/crane-assignments', { params }),
};

// New Assignment API (simplified RBAC)
export const assignmentsAPI = {
  managerToSupervisor: (data) => api.post('/api/assignments/manager-to-supervisor', data),
  supervisorToOperator: (data) => api.post('/api/assignments/supervisor-to-operator', data),
};

export default api;
