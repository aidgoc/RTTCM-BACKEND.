import { useState, useEffect } from 'react';
import { useAuth } from '../../src/lib/auth';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import axios from 'axios';

// Success Modal Component
function CredentialsModal({ credentials, onClose, isDarkMode }) {
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = () => {
    const text = `Company Admin Login Credentials\n\nEmail: ${credentials.email}\nPassword: ${credentials.tempPassword}\n\nPlease share these credentials securely with the client.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Credentials copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-2xl shadow-2xl max-w-md w-full p-8 relative transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        
        <h2 className={`text-2xl font-bold text-center mb-2 transition-colors ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Company Created Successfully!
        </h2>
        <p className={`text-center mb-6 transition-colors ${
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        }`}>
          Admin account has been created. Please save these credentials.
        </p>
        
        {/* Credentials Display */}
        <div className={`rounded-xl p-6 mb-6 transition-colors ${
          isDarkMode 
            ? 'bg-gradient-to-br from-gray-700 to-gray-600 border-2 border-gray-600' 
            : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200'
        }`}>
          <h3 className={`font-bold text-lg mb-4 flex items-center transition-colors ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            <span className="text-2xl mr-2">🔑</span>
            Admin Login Credentials
          </h3>
          
          <div className="space-y-3">
            <div>
              <label className={`text-xs font-semibold uppercase transition-colors ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>Admin Name</label>
              <p className={`text-lg font-mono font-bold p-3 rounded-lg transition-colors ${
                isDarkMode ? 'text-white bg-gray-800' : 'text-gray-900 bg-white'
              }`}>
                {credentials.name}
              </p>
            </div>
            
            <div>
              <label className={`text-xs font-semibold uppercase transition-colors ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>Email</label>
              <p className={`text-lg font-mono font-bold p-3 rounded-lg transition-colors ${
                isDarkMode ? 'text-white bg-gray-800' : 'text-gray-900 bg-white'
              }`}>
                {credentials.email}
              </p>
            </div>
            
            <div>
              <label className={`text-xs font-semibold uppercase transition-colors ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>Password</label>
              <p className={`text-lg font-mono font-bold p-3 rounded-lg transition-colors ${
                isDarkMode ? 'text-red-400 bg-gray-800' : 'text-red-600 bg-white'
              }`}>
                {credentials.tempPassword}
              </p>
            </div>
          </div>
        </div>
        
        {/* Warning */}
        <div className={`rounded-lg p-4 mb-6 transition-colors ${
          isDarkMode 
            ? 'bg-yellow-900/20 border border-yellow-700' 
            : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <p className={`text-sm flex items-start transition-colors ${
            isDarkMode ? 'text-yellow-300' : 'text-yellow-800'
          }`}>
            <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>
              <strong>Important:</strong> Please save these credentials securely and share them with the client. The password will not be shown again.
            </span>
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={copyToClipboard}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            {copied ? (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Credentials
              </>
            )}
          </button>
          
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AddCompany() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [adminCredentials, setAdminCredentials] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    companyId: '', // Company ID field
    contactPerson: '',
    email: '',
    phone: '',
    adminName: '', // Admin full name
    adminPassword: '', // Admin password
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    deviceCount: 0,
    pricePerDevice: 5000,
    billingCycle: 'monthly',
    planType: 'standard',
    gstNumber: '',
    notes: ''
  });

  // Dark mode persistence
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('superadmin-dark-mode');
    if (savedDarkMode !== null) {
      setIsDarkMode(JSON.parse(savedDarkMode));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        companyName: formData.companyName,
        companyId: formData.companyId,
        contactPerson: formData.contactPerson,
        email: formData.email,
        phone: formData.phone,
        adminName: formData.adminName,
        adminPassword: formData.adminPassword,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          country: formData.country
        },
        deviceCount: parseInt(formData.deviceCount) || 0,
        pricePerDevice: parseInt(formData.pricePerDevice) || 5000,
        billingCycle: formData.billingCycle,
        planType: formData.planType,
        gstNumber: formData.gstNumber,
        notes: formData.notes
      };

      const response = await axios.post(`${API_BASE_URL}/api/companies`, payload, {
        withCredentials: true,
      });

      // Show credentials modal
      setAdminCredentials(response.data.adminCredentials);
      setShowCredentialsModal(true);
    } catch (error) {
      console.error('Error creating company:', error);
      toast.error(error.response?.data?.error || 'Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!user || user.role !== 'superadmin') {
    router.push('/');
    return null;
  }

  return (
    <>
      {showCredentialsModal && adminCredentials && (
        <CredentialsModal 
          credentials={adminCredentials}
          isDarkMode={isDarkMode}
          onClose={() => {
            setShowCredentialsModal(false);
            router.push('/superadmin');
          }}
        />
      )}
      
      <div className={`min-h-screen py-8 transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
          : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
      }`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/superadmin')}
            className={`flex items-center mb-4 transition-colors ${
              isDarkMode 
                ? 'text-gray-300 hover:text-white' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          <h1 className={`text-3xl font-bold transition-colors ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Add New Company</h1>
          <p className={`mt-2 transition-colors ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>Create a new client company account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={`rounded-2xl shadow-xl p-8 transition-colors duration-300 ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          {/* Company Information */}
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-4 flex items-center transition-colors ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <span className="text-2xl mr-2">🏢</span>
              Company Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Company Name *
                </label>
                <input
                  type="text"
                  name="companyName"
                  required
                  value={formData.companyName}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="ABC Construction Ltd."
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Company ID *
                </label>
                <input
                  type="text"
                  name="companyId"
                  required
                  value={formData.companyId}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="ABC-CONST-2024"
                />
                <p className={`text-xs mt-1 transition-colors ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Unique identifier for this company (e.g., ABC-CONST-2024)
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Contact Person *
                </label>
                <input
                  type="text"
                  name="contactPerson"
                  required
                  value={formData.contactPerson}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="admin@company.com"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Phone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="+91 1234567890"
                />
              </div>
            </div>
          </div>

          {/* Admin Account Credentials */}
          <div className={`mb-8 pb-8 border-b transition-colors ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <h2 className={`text-xl font-bold mb-4 flex items-center transition-colors ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <span className="text-2xl mr-2">👤</span>
              Admin Login Credentials
            </h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Important:</strong> These credentials will be used by the company admin to login. 
                Please save them securely and share with the client.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Admin Full Name *
                </label>
                <input
                  type="text"
                  name="adminName"
                  required
                  value={formData.adminName}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Admin Password *
                </label>
                <input
                  type="password"
                  name="adminPassword"
                  required
                  minLength="6"
                  value={formData.adminPassword}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Enter secure password (min 6 characters)"
                />
                <p className={`text-xs mt-1 transition-colors ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  This will be the admin's login password. Make sure it's secure!
                </p>
              </div>

              <div className="md:col-span-2">
                <div className={`rounded-lg p-4 transition-colors ${
                  isDarkMode 
                    ? 'bg-blue-900/20 border border-blue-700' 
                    : 'bg-blue-50 border border-blue-200'
                }`}>
                  <p className={`text-sm transition-colors ${
                    isDarkMode ? 'text-blue-300' : 'text-blue-800'
                  }`}>
                    <strong>📧 Admin Email:</strong> {formData.email || 'Not entered yet'}
                  </p>
                  <p className={`text-xs mt-1 transition-colors ${
                    isDarkMode ? 'text-blue-400' : 'text-blue-600'
                  }`}>
                    The admin will use this email and the password above to login.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className={`mb-8 pb-8 border-b transition-colors ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <h2 className={`text-xl font-bold mb-4 flex items-center transition-colors ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <span className="text-2xl mr-2">📍</span>
              Address
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className={`block text-sm font-medium mb-2 transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Street Address
                </label>
                <input
                  type="text"
                  name="street"
                  value={formData.street}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="123 Main Street"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Mumbai"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Maharashtra"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Pincode
                </label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="400001"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Country
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="India"
                />
              </div>
            </div>
          </div>

          {/* Billing Information */}
          <div className={`mb-8 pb-8 border-b transition-colors ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <h2 className={`text-xl font-bold mb-4 flex items-center transition-colors ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <span className="text-2xl mr-2">💰</span>
              Billing Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Number of DRM Devices *
                </label>
                <input
                  type="number"
                  name="deviceCount"
                  required
                  min="0"
                  value={formData.deviceCount}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="25"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Price per Device (₹/month) *
                </label>
                <input
                  type="number"
                  name="pricePerDevice"
                  required
                  min="0"
                  value={formData.pricePerDevice}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="5000"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Billing Cycle *
                </label>
                <select
                  name="billingCycle"
                  value={formData.billingCycle}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Plan Type *
                </label>
                <select
                  name="planType"
                  value={formData.planType}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="basic">Basic</option>
                  <option value="standard">Standard</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  GST Number
                </label>
                <input
                  type="text"
                  name="gstNumber"
                  value={formData.gstNumber}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Monthly Amount (Calculated)
                </label>
                <div className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 font-bold text-lg">
                  ₹{(parseInt(formData.deviceCount) || 0) * (parseInt(formData.pricePerDevice) || 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-4 flex items-center transition-colors ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <span className="text-2xl mr-2">📝</span>
              Additional Notes
            </h2>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="4"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
              placeholder="Any additional information about this company..."
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/superadmin')}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}

