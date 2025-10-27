import { useState, useEffect } from 'react';
import { useAuth } from '../../../src/lib/auth';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import axios from 'axios';
import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function CompanyDetails() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role !== 'superadmin') {
        toast.error('Access denied. Super Admin only.');
        router.push('/');
      } else if (id) {
        fetchCompanyDetails();
      }
    }
  }, [user, authLoading, id]);

  // Dark mode persistence
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('superadmin-dark-mode');
    if (savedDarkMode !== null) {
      setIsDarkMode(JSON.parse(savedDarkMode));
    }
  }, []);

  const fetchCompanyDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/companies/${id}`, {
        withCredentials: true,
      });
      setCompany(response.data.company);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load company details');
      router.push('/superadmin');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusInfo = (company) => {
    if (!company.isActive) {
      return { 
        color: 'text-gray-500', 
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        dot: 'bg-gray-400',
        text: 'Inactive'
      };
    }
    
    const billingDate = new Date(company.subscription.nextBillingDate);
    const today = new Date();
    const daysUntilBilling = Math.ceil((billingDate - today) / (1000 * 60 * 60 * 24));
    
    if (company.paymentStatus.isPaid && daysUntilBilling > 7) {
      return { 
        color: 'text-emerald-700', 
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
        text: 'Active'
      };
    } else if (daysUntilBilling <= 7 && daysUntilBilling > 0) {
      return { 
        color: 'text-amber-700', 
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
        text: `Due in ${daysUntilBilling}d`
      };
    } else if (daysUntilBilling <= 0) {
      return { 
        color: 'text-red-700', 
        bg: 'bg-red-50',
        border: 'border-red-200',
        dot: 'bg-red-500',
        text: 'Overdue'
      };
    }
    
    return { 
      color: 'text-sky-700', 
      bg: 'bg-sky-50',
      border: 'border-sky-200',
      dot: 'bg-sky-500',
      text: 'Trial'
    };
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-sky-600 border-t-transparent mx-auto mb-4"></div>
          <p className={`font-medium transition-colors ${
            isDarkMode ? 'text-gray-300' : 'text-slate-700'
          }`}>Loading Company Details...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return null;
  }

  const totalAmount = company.paymentInfo.totalAmount;
  const taxAmount = company.paymentInfo.taxAmount;
  const baseAmount = company.paymentInfo.baseAmount;
  const status = getStatusInfo(company);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50'
    }`}>
      {/* Top Navigation Bar */}
      <nav className={`backdrop-blur-sm border-b sticky top-0 z-50 shadow-sm transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-gray-800/90 border-gray-700' 
          : 'bg-white/80 border-sky-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Back Button and Company Info */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/superadmin')}
                className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'hover:bg-gray-700' 
                : 'hover:bg-sky-100'
            }`}
              >
                <svg className="w-6 h-6 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-lg">
                  {company.companyName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">{company.companyName}</h1>
                <p className="text-xs text-sky-600 font-medium">Complete Overview & Analytics</p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.color} border ${status.border}`}>
                <span className={`w-2 h-2 rounded-full ${status.dot} mr-2`}></span>
                {status.text}
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className={`backdrop-blur-sm rounded-xl border p-6 hover:shadow-lg transition-all duration-300 ${
              isDarkMode 
                ? 'bg-gray-800/70 border-gray-700 hover:bg-gray-800/80' 
                : 'bg-white/70 border-sky-200 hover:bg-white/80'
            }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-sky-700">Tower Cranes</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">{company.stats.totalCranes}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-sky-100 to-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>

          <div className={`backdrop-blur-sm rounded-xl border p-6 hover:shadow-lg transition-all duration-300 ${
              isDarkMode 
                ? 'bg-gray-800/70 border-gray-700 hover:bg-gray-800/80' 
                : 'bg-white/70 border-sky-200 hover:bg-white/80'
            }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-sky-700">DRM Devices</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">{company.billing.deviceCount}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
            </div>
          </div>

          <div className={`backdrop-blur-sm rounded-xl border p-6 hover:shadow-lg transition-all duration-300 ${
              isDarkMode 
                ? 'bg-gray-800/70 border-gray-700 hover:bg-gray-800/80' 
                : 'bg-white/70 border-sky-200 hover:bg-white/80'
            }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-sky-700">Total Users</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">{company.userStats.total}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className={`backdrop-blur-sm rounded-xl border p-6 hover:shadow-lg transition-all duration-300 ${
              isDarkMode 
                ? 'bg-gray-800/70 border-gray-700 hover:bg-gray-800/80' 
                : 'bg-white/70 border-sky-200 hover:bg-white/80'
            }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-sky-700">Monthly Revenue</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">
                  {formatCurrency(company.billing.monthlyAmount)}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Data Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-sky-200 p-6 mb-6 shadow-sm">
          <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-sky-200">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-100 to-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800">Financial Data</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="bg-sky-50 rounded-lg p-3 border border-sky-200">
                <p className="text-xs font-medium text-sky-700 mb-1">Monthly Rental (Base)</p>
                <p className="text-2xl font-bold text-sky-600">{formatCurrency(baseAmount)}</p>
                <p className="text-xs text-sky-600">
                  {formatCurrency(company.billing.pricePerDevice)} × {company.billing.deviceCount} devices
                </p>
              </div>

              <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                <p className="text-xs font-medium text-amber-700 mb-1">GST ({company.billing.taxRate}%)</p>
                <p className="text-xl font-bold text-amber-600">+ {formatCurrency(taxAmount)}</p>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-4 border-2 border-emerald-200">
                <p className="text-xs font-medium text-emerald-700 mb-1">Total Monthly Amount</p>
                <p className="text-3xl font-bold text-emerald-600">{formatCurrency(totalAmount)}</p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="bg-sky-50 rounded-lg p-3 border border-sky-200">
                <p className="text-xs font-medium text-sky-700 mb-1">Payment Status</p>
                <div className="flex items-center space-x-2">
                  {company.paymentStatus.isPaid ? (
                    <>
                      <span className="text-lg">✅</span>
                      <span className="text-lg font-bold text-emerald-600">Paid</span>
                    </>
                  ) : (
                    <>
                      <span className="text-lg">⚠️</span>
                      <span className="text-lg font-bold text-red-600">Pending</span>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-xs font-medium text-blue-700 mb-1">Next Billing Date</p>
                <p className="text-lg font-bold text-blue-600">
                  {formatDate(company.subscription.nextBillingDate)}
                </p>
                <p className="text-xs text-blue-600">
                  {company.daysUntilBilling > 0 
                    ? `${company.daysUntilBilling} days remaining`
                    : `${Math.abs(company.daysUntilBilling)} days overdue`
                  }
                </p>
              </div>

              <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                <p className="text-xs font-medium text-indigo-700 mb-1">Billing Cycle</p>
                <p className="text-lg font-bold text-indigo-600 capitalize">
                  {company.subscription.billingCycle}
                </p>
              </div>
            </div>
          </div>

          {/* GST Information */}
          {company.billing.gstNumber && (
            <div className="mt-4 pt-4 border-t border-sky-200">
              <p className="text-xs text-sky-600 font-medium">GST Number</p>
              <p className="text-sm font-mono font-semibold text-slate-800">{company.billing.gstNumber}</p>
            </div>
          )}
        </div>

        {/* Analytics Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-sky-200 p-6 mb-6 shadow-sm">
          <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-sky-200">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800">Analytics & Statistics</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* User Distribution */}
            <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-lg p-4 border border-sky-200">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-2 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                User Distribution
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sky-600 text-sm">Managers</span>
                  <span className="text-lg font-bold text-sky-600">{company.userStats.managers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sky-600 text-sm">Supervisors</span>
                  <span className="text-lg font-bold text-blue-600">{company.userStats.supervisors}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sky-600 text-sm">Operators</span>
                  <span className="text-lg font-bold text-indigo-600">{company.userStats.operators}</span>
                </div>
              </div>
            </div>

            {/* Device Health */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-4 border border-emerald-200">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                Device Health
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-600 text-sm">Active</span>
                  <span className="text-lg font-bold text-emerald-600">{company.stats.activeDRMDevices}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-emerald-600 text-sm">Offline</span>
                  <span className="text-lg font-bold text-red-600">{company.stats.offlineDRMDevices}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-emerald-600 text-sm">Total</span>
                  <span className="text-lg font-bold text-slate-800">{company.billing.deviceCount}</span>
                </div>
              </div>
            </div>

            {/* System Usage */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-2 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                System Usage
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-amber-600 text-sm">Cranes</span>
                  <span className="text-lg font-bold text-amber-600">{company.stats.totalCranes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-amber-600 text-sm">Plan Type</span>
                  <span className="text-sm font-bold text-orange-600 capitalize">{company.subscription.planType}</span>
                </div>
                <div className="text-xs text-amber-600">
                  Last Activity: {company.lastActivityDate ? new Date(company.lastActivityDate).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-sky-200 p-6 mb-6 shadow-sm">
          <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-sky-200">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800">Contact Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="bg-sky-50 rounded-lg p-3 border border-sky-200">
                <p className="text-xs font-medium text-sky-700 mb-1">Company Admin</p>
                <p className="text-lg font-semibold text-slate-800">{company.contactPerson}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-xs font-medium text-blue-700 mb-1">Email</p>
                <a href={`mailto:${company.email}`} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  {company.email}
                </a>
              </div>
              <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                <p className="text-xs font-medium text-indigo-700 mb-1">Phone</p>
                <a href={`tel:${company.phone}`} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  {company.phone}
                </a>
              </div>
            </div>

            {company.address && (
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-xs font-medium text-slate-700 mb-2">Address</p>
                <div className="text-slate-800 space-y-1 text-sm">
                  {company.address.street && <p>{company.address.street}</p>}
                  {company.address.city && <p>{company.address.city}, {company.address.state}</p>}
                  {company.address.pincode && <p>{company.address.pincode}</p>}
                  {company.address.country && <p>{company.address.country}</p>}
                </div>
              </div>
            )}
          </div>

          {company.notes && (
            <div className="mt-4 pt-4 border-t border-sky-200">
              <p className="text-xs text-sky-600 font-medium mb-2">Notes</p>
              <p className="text-slate-700 bg-sky-50 rounded-lg p-3 border border-sky-200 text-sm">{company.notes}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
          <button
            onClick={() => router.push('/superadmin')}
            className="px-6 py-2 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-700 transition-all shadow-sm hover:shadow-md"
          >
            ← Back to Dashboard
          </button>
          <button
            onClick={() => router.push(`/companies/${id}/payment`)}
            className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-green-700 transition-all shadow-sm hover:shadow-md"
          >
            💳 Record Payment
          </button>
          <button
            onClick={() => router.push(`/companies/${id}/edit`)}
            className="px-6 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg font-medium hover:from-sky-600 hover:to-blue-700 transition-all shadow-sm hover:shadow-md"
          >
            ✏️ Edit Company
          </button>
        </div>
      </main>
    </div>
  );
}