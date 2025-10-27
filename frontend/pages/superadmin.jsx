import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../src/lib/auth';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useRouter } from 'next/router';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function SuperAdminDashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch companies and stats
      const [companiesResponse, statsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/companies`, {
          params: { status: filter === 'all' ? null : filter },
          withCredentials: true,
        }),
        axios.get(`${API_BASE_URL}/api/companies/stats`, {
          withCredentials: true,
        })
      ]);
      
      setCompanies(companiesResponse.data.companies);
      setFilteredCompanies(companiesResponse.data.companies);
      setStats(statsResponse.data.stats);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role !== 'superadmin') {
        toast.error('Access denied. Super Admin only.');
        router.push('/');
      } else {
        fetchData();
      }
    }
  }, [user, authLoading, router, fetchData]);

  // Dark mode persistence
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('superadmin-dark-mode');
    if (savedDarkMode !== null) {
      setIsDarkMode(JSON.parse(savedDarkMode));
    }
  }, []);

  // Update dark mode in localStorage
  useEffect(() => {
    localStorage.setItem('superadmin-dark-mode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Search and filter functionality
  const filterCompanies = useCallback(() => {
    let filtered = [...companies];

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(company => {
        if (filter === 'active') return company.isActive && !company.isOverdue;
        if (filter === 'overdue') return company.isOverdue;
        if (filter === 'inactive') return !company.isActive;
        return true;
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(company => {
        return (
          company.companyName.toLowerCase().includes(query) ||
          company.companyId.toLowerCase().includes(query) ||
          company.contactPerson.toLowerCase().includes(query) ||
          company.email.toLowerCase().includes(query) ||
          (company.adminUser && company.adminUser.name && company.adminUser.name.toLowerCase().includes(query))
        );
      });
    }

    setFilteredCompanies(filtered);
  }, [companies, filter, searchQuery]);

  useEffect(() => {
    filterCompanies();
  }, [filterCompanies]);

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
        color: 'text-green-700', 
        bg: 'bg-green-50',
        border: 'border-green-200',
        dot: 'bg-green-500',
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
      color: 'text-blue-700', 
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      dot: 'bg-blue-500',
      text: 'Trial'
    };
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };


  // Format time function
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Format date function
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'superadmin') {
    return null;
  }

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
          : 'bg-sky-100/90 border-sky-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-3">
              <div className={`w-14 h-14 rounded-lg flex items-center justify-center shadow-md overflow-hidden border transition-colors duration-300 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600' 
                  : 'bg-white border-sky-200'
              }`}>
                <img 
                  src="https://static.wixstatic.com/media/aa586b_c34115138e93455583467f6af60004eb~mv2.png/v1/fill/w_980,h_526,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/Dyamic%20Logo%20-%20Colour.png" 
                  alt="DCE Logo" 
                  className="w-12 h-12 object-contain"
                  onError={(e) => {
                    // Fallback to text if image fails to load
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <span className="text-white font-bold text-sm hidden">DCE</span>
              </div>
              <div>
                <h1 className={`text-lg font-bold transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>Dynamic Crane Engineers</h1>
                <p className={`text-xs font-medium transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-sky-600'
                }`}>Super Admin Portal</p>
              </div>
            </div>

            {/* Time Display */}
            <div className="hidden lg:flex items-center space-x-4">
              <div className={`text-center px-4 py-2 rounded-lg border transition-colors duration-300 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600' 
                  : 'bg-sky-50 border-sky-200'
              }`}>
                <p className={`text-sm font-medium transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>{formatTime(currentTime)}</p>
                <p className={`text-xs transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-sky-600'
                }`}>{formatDate(currentTime)}</p>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {/* Dark Mode Toggle */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-lg transition-colors duration-300 ${
                  isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
                    : 'bg-sky-100 hover:bg-sky-200 text-gray-600'
                }`}
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              <div className={`hidden md:block text-right px-4 py-2 rounded-lg border transition-colors duration-300 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600' 
                  : 'bg-sky-50 border-sky-200'
              }`}>
                <p className={`text-sm font-medium transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>{user.name}</p>
                <p className={`text-xs font-medium transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-sky-600'
                }`}>{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm hover:shadow-md"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className={`text-2xl font-bold transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-slate-800'
          }`}>Client Overview</h2>
          <p className={`text-sm mt-1 font-medium transition-colors duration-300 ${
            isDarkMode ? 'text-gray-300' : 'text-sky-600'
          }`}>Manage and monitor your client companies</p>
        </div>

        {/* Stats Overview Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Companies */}
            <div className={`backdrop-blur-sm rounded-xl border p-6 hover:shadow-lg transition-all duration-300 ${
              isDarkMode 
                ? 'bg-gray-800/70 border-gray-700 hover:bg-gray-800/80' 
                : 'bg-white/70 border-sky-200 hover:bg-white/80'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-sky-700'
                  }`}>Total Companies</p>
                  <p className={`text-3xl font-bold mt-2 transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-slate-800'
                  }`}>{stats.totalCompanies}</p>
                  <p className="text-xs text-emerald-600 mt-2 font-medium">
                    {stats.activeSubscriptions} active
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-sky-100 to-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Monthly Revenue */}
            <div className={`backdrop-blur-sm rounded-xl border p-6 hover:shadow-lg transition-all duration-300 ${
              isDarkMode 
                ? 'bg-gray-800/70 border-gray-700 hover:bg-gray-800/80' 
                : 'bg-white/70 border-sky-200 hover:bg-white/80'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-sky-700'
                  }`}>Monthly Revenue</p>
                  <p className={`text-3xl font-bold mt-2 transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-slate-800'
                  }`}>
                    {formatCurrency(stats.revenue.totalMonthlyRevenue)}
                  </p>
                  <p className="text-xs text-sky-600 mt-2 font-medium">
                    {stats.revenue.totalDevices} devices
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Upcoming Payments */}
            <div className={`backdrop-blur-sm rounded-xl border p-6 hover:shadow-lg transition-all duration-300 ${
              isDarkMode 
                ? 'bg-gray-800/70 border-gray-700 hover:bg-gray-800/80' 
                : 'bg-white/70 border-sky-200 hover:bg-white/80'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-sky-700'
                  }`}>Upcoming (7d)</p>
                  <p className={`text-3xl font-bold mt-2 transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-slate-800'
                  }`}>
                    {formatCurrency(stats.upcomingPayments.amount)}
                  </p>
                  <p className="text-xs text-amber-600 mt-2 font-medium">
                    {stats.upcomingPayments.count} payments
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Overdue */}
            <div className={`backdrop-blur-sm rounded-xl border p-6 hover:shadow-lg transition-all duration-300 ${
              isDarkMode 
                ? 'bg-gray-800/70 border-gray-700 hover:bg-gray-800/80' 
                : 'bg-white/70 border-sky-200 hover:bg-white/80'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-sky-700'
                  }`}>Overdue</p>
                  <p className={`text-3xl font-bold mt-2 transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-slate-800'
                  }`}>
                    {formatCurrency(stats.overduePayments.amount)}
                  </p>
                  <p className="text-xs text-red-600 mt-2 font-medium">
                    {stats.overduePayments.count} companies
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-pink-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className={`backdrop-blur-sm rounded-xl border p-4 mb-6 shadow-sm transition-colors duration-300 ${
          isDarkMode 
            ? 'bg-gray-800/70 border-gray-700' 
            : 'bg-white/70 border-sky-200'
        }`}>
          <div className="flex flex-col space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by company name, ID, admin name, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors bg-white/50 backdrop-blur-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg className="h-5 w-5 text-sky-400 hover:text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Filters and Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              {/* Filters */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-sky-700">Filter:</span>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  filter === 'all'
                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md'
                    : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  filter === 'active'
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilter('overdue')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  filter === 'overdue'
                    ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-md'
                    : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                }`}
              >
                Overdue
              </button>
            </div>

              {/* Add Company Button */}
              <button
                onClick={() => router.push('/companies/add')}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-sky-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Company
              </button>
            </div>

            {/* Search Results Counter */}
            {(searchQuery || filter !== 'all') && (
              <div className="text-sm text-sky-600 font-medium">
                Showing {filteredCompanies.length} of {companies.length} companies
                {searchQuery && ` matching "${searchQuery}"`}
              </div>
            )}
          </div>
        </div>

        {/* Companies Cards Grid */}
        {filteredCompanies.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-sky-200 p-12 text-center shadow-sm">
            <svg className="w-16 h-16 mx-auto text-sky-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-lg font-medium text-slate-800">
              {searchQuery || filter !== 'all' ? 'No companies match your search' : 'No companies found'}
            </p>
            <p className="text-sm text-sky-600 mt-1 font-medium">
              {searchQuery || filter !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'Get started by adding your first client company'
              }
            </p>
            {(!searchQuery && filter === 'all') && (
              <button
                onClick={() => router.push('/companies/add')}
                className="mt-4 inline-flex items-center px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-sky-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Add Company
              </button>
            )}
            {(searchQuery || filter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilter('all');
                }}
                className="mt-4 inline-flex items-center px-4 py-2 bg-slate-600 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCompanies.map((company) => {
              const status = getStatusInfo(company);
              return (
                <div
                  key={company._id}
                  className={`group backdrop-blur-sm rounded-xl border hover:shadow-lg transition-all duration-300 overflow-hidden shadow-sm relative ${
                    isDarkMode 
                      ? 'bg-gray-800/70 border-gray-700 hover:border-gray-600 hover:bg-gray-800/80' 
                      : 'bg-white/70 border-sky-200 hover:border-sky-300 hover:bg-white/80'
                  }`}
                >

                  {/* Card Header */}
                  <div className={`p-6 border-b transition-colors duration-300 ${
                    isDarkMode ? 'border-gray-700' : 'border-sky-100'
                  }`}>
                    <div className="flex items-start justify-between mb-4">
                      {/* Company Logo */}
                      <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                        <span className="text-white font-semibold text-lg">
                          {company.companyName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      
                      {/* Status Badge */}
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color} border ${status.border} group-hover:scale-105 transition-transform`}>
                        <span className={`w-2 h-2 rounded-full ${status.dot} mr-1.5`}></span>
                        {status.text}
                      </span>
                    </div>
                    
                    {/* Company Name */}
                    <h3 className={`text-lg font-semibold group-hover:text-sky-600 transition-colors ${
                      isDarkMode ? 'text-white' : 'text-slate-800'
                    }`}>
                      {company.companyName}
                    </h3>
                    <p className={`text-sm mt-1 font-medium transition-colors ${
                      isDarkMode ? 'text-gray-300' : 'text-sky-600'
                    }`}>ID: {company.companyId}</p>
                  </div>

                  {/* Card Body */}
                  <div 
                    className="p-6 space-y-4 cursor-pointer"
                    onClick={() => router.push(`/companies/${company._id}/details`)}
                  >
                    {/* Admin Info */}
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-xs">
                          {company.contactPerson.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate transition-colors ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>{company.contactPerson}</p>
                        <p className={`text-xs truncate transition-colors ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>{company.email}</p>
                      </div>
                    </div>

                    {/* Resources */}
                    <div className={`grid grid-cols-2 gap-4 py-3 border-t transition-colors ${
                      isDarkMode ? 'border-gray-700' : 'border-sky-100'
                    }`}>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-sky-600 group-hover:text-sky-700 transition-colors">
                          {company.stats.totalCranes}
                        </div>
                        <div className="text-xs text-sky-600 font-medium">Tower Cranes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
                          {company.billing.deviceCount}
                        </div>
                        <div className="text-xs text-blue-600 font-medium">DRM Devices</div>
                      </div>
                    </div>

                    {/* Monthly Revenue */}
                    <div className={`py-3 border-t transition-colors ${
                      isDarkMode ? 'border-gray-700' : 'border-sky-100'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-xs font-medium transition-colors ${
                            isDarkMode ? 'text-gray-300' : 'text-sky-600'
                          }`}>Monthly Revenue</p>
                          <p className={`text-lg font-bold group-hover:text-emerald-600 transition-colors ${
                            isDarkMode ? 'text-white' : 'text-slate-800'
                          }`}>
                            {formatCurrency(company.billing.monthlyAmount)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs capitalize font-medium transition-colors ${
                            isDarkMode ? 'text-gray-300' : 'text-sky-600'
                          }`}>
                            {company.subscription.billingCycle}
                          </p>
                          <p className={`text-xs transition-colors ${
                            isDarkMode ? 'text-gray-400' : 'text-sky-500'
                          }`}>
                            {company.subscription.status}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2">
                      <div className={`w-full py-2 px-4 rounded-lg text-center transition-colors ${
                        isDarkMode 
                          ? 'bg-gray-700 group-hover:bg-gray-600' 
                          : 'bg-sky-50 group-hover:bg-sky-100'
                      }`}>
                        <span className={`text-sm font-medium transition-colors ${
                          isDarkMode 
                            ? 'text-gray-300 group-hover:text-white' 
                            : 'text-sky-700 group-hover:text-sky-800'
                        }`}>
                          View Details →
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

    </div>
  );
}
