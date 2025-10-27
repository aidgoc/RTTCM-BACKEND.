import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../lib/auth';
import toast from 'react-hot-toast';

export default function LoginForm() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const result = await login(data.email, data.password);
      
      if (result.success) {
        toast.success('Login successful!');
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (role) => {
    const credentials = {
      admin: { email: 'admin@cranefleet.com', password: 'password123' },
      manager: { email: 'manager@cranefleet.com', password: 'password123' },
      operator: { email: 'operator@cranefleet.com', password: 'password123' },
    };
    
    const creds = credentials[role];
    // This would need to be implemented with form state management
    console.log('Demo credentials:', creds);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="form-label">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="form-input"
            placeholder="Enter your email"
            {...register('email', { 
              required: 'Email is required',
              pattern: {
                value: /^\S+@\S+$/i,
                message: 'Invalid email address'
              }
            })}
          />
          {errors.email && (
            <p className="form-error">{errors.email.message}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="form-input"
            placeholder="Enter your password"
            {...register('password', { 
              required: 'Password is required',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters'
              }
            })}
          />
          {errors.password && (
            <p className="form-error">{errors.password.message}</p>
          )}
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
            'Sign in'
          )}
        </button>
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <a href="/signup" className="font-medium text-primary-600 hover:text-primary-500">
            Sign up
          </a>
        </p>
      </div>
    </form>
  );
}
