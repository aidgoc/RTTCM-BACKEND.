import { useState } from 'react';
import { useAuth } from '../src/lib/auth';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'superadmin',
    headOfficeId: '',
  });
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const result = await signup(
        formData.name,
        formData.email,
        formData.password,
        formData.role,
        formData.headOfficeId
      );
      
      if (result.success) {
        toast.success('Account created successfully!');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">DCE</span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Super Admin Registration
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Dynamic Crane Engineers - Staff Only
          </p>
        </div>

        {/* Signup Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="form-label">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="form-input"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label htmlFor="email" className="form-label">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="form-input"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label htmlFor="role" className="form-label">
                Role
              </label>
              <select
                id="role"
                name="role"
                className="form-input"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="superadmin">Super Admin (Dynamic Crane Engineers Only)</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Note: Company users are created by their managers, not through public signup.
              </p>
            </div>
            
            {/* Head Office ID - Only for Super Admin */}
            {formData.role === 'superadmin' && (
              <div>
                <label htmlFor="headOfficeId" className="form-label">
                  Head Office ID
                </label>
                <input
                  id="headOfficeId"
                  name="headOfficeId"
                  type="password"
                  required={formData.role === 'superadmin'}
                  className="form-input"
                  placeholder="Enter Head Office ID"
                  value={formData.headOfficeId}
                  onChange={handleChange}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Required for Super Admin registration
                </p>
              </div>
            )}
            
            <div>
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="form-input"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="form-input"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex justify-center py-2 px-4"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Create Account'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
