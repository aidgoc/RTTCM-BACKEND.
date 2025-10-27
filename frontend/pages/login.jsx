import { useState } from 'react';
import { useAuth } from '../src/lib/auth';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    companyId: '', // Company ID for all users
    headOfficeId: '', // Only for super admin
  });
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('admin'); // Default to admin
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Send companyId for all users, headOfficeId only for superadmin
      const result = await login(
        formData.email, 
        formData.password, 
        formData.companyId,
        selectedRole === 'superadmin' ? formData.headOfficeId : null
      );
      
      if (result.success) {
        toast.success(`Welcome back, ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}!`);
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
      admin: { email: 'admin@cranefleet.com', password: 'password123', companyId: 'DEMO-COMP-2024' },
      manager: { email: 'manager@cranefleet.com', password: 'password123', companyId: 'DEMO-COMP-2024' },
      operator: { email: 'operator@cranefleet.com', password: 'password123', companyId: 'DEMO-COMP-2024' },
    };
    
    const creds = credentials[role];
    setFormData(prev => ({ ...prev, ...creds }));
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
              {/* Role Selector */}
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                  Login As
                </label>
                <select
                  id="role"
                  name="role"
                  value={selectedRole}
                  onChange={(e) => {
                    setSelectedRole(e.target.value);
                    // Clear fields based on role
                    if (e.target.value === 'superadmin') {
                      setFormData({ ...formData, companyId: '' });
                    } else {
                      setFormData({ ...formData, headOfficeId: '' });
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="admin">🏢 Admin (Company Administrator)</option>
                  <option value="manager">👔 Manager</option>
                  <option value="supervisor">👷 Supervisor</option>
                  <option value="operator">🎮 Operator</option>
                  <option value="superadmin">⭐ Super Admin (DCE Only)</option>
                </select>
                <p className="text-xs text-gray-600 mt-1">
                  Select your role to continue
                </p>
              </div>

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

              {/* Company ID - Required for all users except superadmin */}
              {selectedRole !== 'superadmin' && (
                <div>
                  <label htmlFor="companyId" className="block text-sm font-medium text-gray-700 mb-2">
                    🏢 Company ID
                  </label>
                  <input
                    id="companyId"
                    name="companyId"
                    type="text"
                    required={selectedRole !== 'superadmin'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your Company ID (e.g., ABC-CONST-2024)"
                    value={formData.companyId}
                    onChange={handleChange}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Get this from your company administrator
                  </p>
                </div>
              )}
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
              
              {/* Head Office ID - Only for Super Admin */}
              {selectedRole === 'superadmin' && (
                <div>
                  <label htmlFor="headOfficeId" className="block text-sm font-medium text-gray-700 mb-2">
                    🔑 Head Office ID
                  </label>
                  <input
                    id="headOfficeId"
                    name="headOfficeId"
                    type="password"
                    required={selectedRole === 'superadmin'}
                    className="w-full px-4 py-3 border border-yellow-400 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-yellow-50"
                    placeholder="Enter Dynamic Crane Engineers Head Office ID"
                    value={formData.headOfficeId}
                    onChange={handleChange}
                  />
                  <div className="mt-2 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                    <p className="text-xs text-yellow-800 font-semibold flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      This field is only for Dynamic Crane Engineers Super Admin
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Role Description */}
            {selectedRole !== 'superadmin' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800 text-center">
                  {selectedRole === 'admin' && '✨ You will be redirected to Company Admin Dashboard'}
                  {selectedRole === 'manager' && '✨ You will be redirected to Manager Dashboard'}
                  {selectedRole === 'supervisor' && '✨ You will be redirected to Supervisor Dashboard'}
                  {selectedRole === 'operator' && '✨ You will be redirected to Operator Dashboard'}
                </p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-lg"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mx-auto"></div>
                ) : (
                  <>
                    {selectedRole === 'superadmin' ? '🔐 Super Admin Login' : `Sign in as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`}
                  </>
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
