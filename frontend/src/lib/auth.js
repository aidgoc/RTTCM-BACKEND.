import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
        withCredentials: true,
      });
      setUser(response.data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password,
      }, {
        withCredentials: true,
      });
      
      setUser(response.data.user);
      return { success: true, user: response.data.user };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const signup = async (name, email, password, role = 'operator') => {
    try {
      console.log('Signup request starting...', { name, email, role, url: `${API_BASE_URL}/api/auth/signup` });
      const response = await axios.post(`${API_BASE_URL}/api/auth/signup`, {
        name,
        email,
        password,
        role,
      }, {
        withCredentials: true,
      });
      
      console.log('Signup response:', response.data);
      setUser(response.data.user);
      return { success: true, user: response.data.user };
    } catch (error) {
      console.error('Signup error:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, {
        withCredentials: true,
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  // Role-based helper functions
  const hasRole = (role) => {
    return user?.role === role;
  };

  const hasAnyRole = (roles) => {
    return roles.includes(user?.role);
  };

  const canCreateUser = (targetRole) => {
    if (!user) return false;
    
    // New simplified hierarchy
    const creationHierarchy = {
      'admin': ['manager'],
      'manager': ['supervisor'],
      'supervisor': ['operator'],
      'operator': []
    };

    return creationHierarchy[user.role]?.includes(targetRole) || false;
  };

  const canManageCranes = () => {
    return hasAnyRole(['admin', 'manager']);
  };

  const canCreateCranes = () => {
    return hasRole('manager');
  };

  const canAssignCranes = () => {
    return hasAnyRole(['admin', 'manager', 'supervisor']);
  };

  const canViewAssets = () => {
    return hasAnyRole(['admin', 'manager', 'supervisor']);
  };

  const canViewAllCranes = () => {
    return hasRole('admin');
  };

  const canManageUsers = () => {
    return hasAnyRole(['admin', 'manager', 'supervisor']);
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    checkAuth,
    // Role-based helpers
    hasRole,
    hasAnyRole,
    canCreateUser,
    canManageCranes,
    canCreateCranes,
    canAssignCranes,
    canViewAssets,
    canViewAllCranes,
    canManageUsers,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
