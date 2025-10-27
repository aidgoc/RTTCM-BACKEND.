import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (url, options = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Request failed');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const get = useCallback((url, options = {}) => 
    request(url, { ...options, method: 'GET' }), [request]);
  
  const post = useCallback((url, data, options = {}) => 
    request(url, { 
      ...options, 
      method: 'POST', 
      body: JSON.stringify(data) 
    }), [request]);
  
  const patch = useCallback((url, data, options = {}) => 
    request(url, { 
      ...options, 
      method: 'PATCH', 
      body: JSON.stringify(data) 
    }), [request]);
  
  const del = useCallback((url, options = {}) => 
    request(url, { ...options, method: 'DELETE' }), [request]);

  return {
    loading,
    error,
    request,
    get,
    post,
    patch,
    delete: del,
  };
};

