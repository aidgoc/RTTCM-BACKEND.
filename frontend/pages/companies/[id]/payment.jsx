import { useState, useEffect } from 'react';
import { useAuth } from '../../../src/lib/auth';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function RecordPayment() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank_transfer',
    reference: '',
    notes: ''
  });

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

  const fetchCompanyDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/companies/${id}`, {
        withCredentials: true,
      });
      setCompany(response.data.company);
      // Pre-fill amount with total monthly amount
      setFormData(prev => ({
        ...prev,
        amount: response.data.company.billing.monthlyAmount.toString()
      }));
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load company details');
      router.push('/superadmin');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.paymentDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      
      // Here you would typically make an API call to record the payment
      // For now, we'll simulate it
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Payment recorded successfully!');
      router.push(`/companies/${id}/details`);
    } catch (error) {
      console.error('Payment recording error:', error);
      toast.error('Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-sky-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-700 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-sky-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push(`/companies/${id}/details`)}
                className="p-2 hover:bg-sky-100 rounded-lg transition-colors"
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
                <h1 className="text-lg font-bold text-slate-800">Record Payment</h1>
                <p className="text-xs text-sky-600 font-medium">{company.companyName}</p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Company Summary */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-sky-200 p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Payment Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-sky-50 rounded-lg p-4 border border-sky-200">
              <p className="text-sm font-medium text-sky-700 mb-1">Monthly Amount</p>
              <p className="text-2xl font-bold text-sky-600">{formatCurrency(company.billing.monthlyAmount)}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <p className="text-sm font-medium text-amber-700 mb-1">Payment Status</p>
              <p className="text-lg font-bold text-amber-600">
                {company.paymentStatus.isPaid ? 'Paid' : 'Pending'}
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm font-medium text-blue-700 mb-1">Next Billing</p>
              <p className="text-lg font-bold text-blue-600">
                {new Date(company.subscription.nextBillingDate).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-sky-200 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Record New Payment</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Amount *
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                  placeholder="Enter amount"
                  required
                />
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Date *
                </label>
                <input
                  type="date"
                  name="paymentDate"
                  value={formData.paymentDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                  required
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Method
                </label>
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                  <option value="online">Online Payment</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Reference Number */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reference Number
                </label>
                <input
                  type="text"
                  name="reference"
                  value={formData.reference}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                  placeholder="Transaction ID, Cheque No., etc."
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                placeholder="Additional notes about this payment..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
              <button
                type="button"
                onClick={() => router.push(`/companies/${id}/details`)}
                className="px-6 py-2 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-700 transition-all shadow-sm hover:shadow-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-green-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Recording...' : '💳 Record Payment'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
