import { useState } from 'react';
import { useAuth } from '../src/lib/auth';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        toast.success('Login successful!');
        if (typeof window !== 'undefined') window.location.href = '/';
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const fillDemoCredentials = (role) => {
    const credentials = {
      admin: { email: 'admin@cranefleet.com', password: 'password123' },
      manager: { email: 'manager@cranefleet.com', password: 'password123' },
      operator: { email: 'operator@cranefleet.com', password: 'password123' },
    };
    
    const creds = credentials[role];
    setFormData(creds);
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      style={{
        backgroundImage: 'url(https://images.pexels.com/photos/224924/pexels-photo-224924.jpeg?cs=srgb&dl=pexels-asphotograpy-224924.jpg&fm=jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Background Overlay for better readability */}
      <div className="absolute inset-0 bg-black/20 z-0"></div>
      
      {/* Login Form Container */}
      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shadow-2xl border border-white/30">
            <span className="text-gray-800 font-bold text-2xl">TD</span>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-white drop-shadow-lg">
            Real Time Tower Crane Monitor
          </h2>
          <p className="mt-2 text-lg font-bold text-white drop-shadow-md">
            Sign in to your account
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white/20 backdrop-blur-md rounded-xl shadow-2xl p-8 border border-white/30">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mx-auto"></div>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="text-center">
          <p className="text-sm text-white drop-shadow-md">
            Don't have an account?{' '}
            <Link href="/signup" className="font-bold text-blue-200 hover:text-blue-100 transition-colors drop-shadow-md">
              Sign up
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
