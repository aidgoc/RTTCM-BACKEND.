const express = require('express');
const Company = require('../models/Company');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { 
  smartCache, 
  cacheInvalidation 
} = require('../middleware/cache');

const router = express.Router();

/**
 * GET /api/companies
 * Get all companies (Super Admin only)
 */
router.get('/', authenticateToken, requirePermission('companies.read'), smartCache, async (req, res) => {
  try {
    const { status, search, sortBy = 'createdAt', order = 'desc' } = req.query;
    
    // Build query
    const query = {};
    
    if (status) {
      if (status === 'active') {
        query.isActive = true;
        query['subscription.status'] = 'active';
      } else if (status === 'inactive') {
        query.isActive = false;
      } else if (status === 'overdue') {
        query.isActive = true;
        query['paymentStatus.isPaid'] = false;
        query['subscription.nextBillingDate'] = { $lt: new Date() };
      }
    }
    
    if (search) {
      query.$text = { $search: search };
    }
    
    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;
    
    const companies = await Company.find(query)
      .populate('adminUser', 'name email')
      .sort(sortOptions);
    
    res.json({
      success: true,
      count: companies.length,
      companies: companies.map(c => c.toPublicJSON())
    });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

/**
 * GET /api/companies/stats
 * Get overall statistics (Super Admin only)
 */
router.get('/stats', authenticateToken, requirePermission('companies.read'), smartCache, async (req, res) => {
  try {
    const totalCompanies = await Company.countDocuments({ isActive: true });
    const activeSubscriptions = await Company.countDocuments({ 
      isActive: true, 
      'subscription.status': 'active' 
    });
    
    const overduePayments = await Company.countDocuments({
      isActive: true,
      'subscription.nextBillingDate': { $lt: new Date() },
      'paymentStatus.isPaid': false
    });
    
    const revenueStats = await Company.getTotalRevenue();
    
    // Calculate overdue amount
    const overdueCompanies = await Company.find({
      isActive: true,
      'subscription.nextBillingDate': { $lt: new Date() },
      'paymentStatus.isPaid': false
    });
    
    const overdueAmount = overdueCompanies.reduce((sum, company) => {
      return sum + company.billing.monthlyAmount;
    }, 0);
    
    // Upcoming billing (next 7 days)
    const upcomingBilling = await Company.findUpcomingBilling(7);
    const upcomingAmount = upcomingBilling.reduce((sum, company) => {
      return sum + company.billing.monthlyAmount;
    }, 0);
    
    res.json({
      success: true,
      stats: {
        totalCompanies,
        activeSubscriptions,
        overduePayments: {
          count: overduePayments,
          amount: overdueAmount
        },
        upcomingPayments: {
          count: upcomingBilling.length,
          amount: upcomingAmount
        },
        revenue: {
          totalMonthlyRevenue: revenueStats.totalRevenue,
          totalDevices: revenueStats.totalDevices
        }
      }
    });
  } catch (error) {
    console.error('Get company stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * GET /api/companies/:id
 * Get single company details (Super Admin only)
 */
router.get('/:id', authenticateToken, requirePermission('companies.read'), smartCache, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate('adminUser', 'name email phone lastLogin')
      .populate('createdBy', 'name email');
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    // Get user count by role
    const users = await User.find({ companyId: company._id, isActive: true });
    const userStats = {
      total: users.length,
      managers: users.filter(u => u.role === 'manager').length,
      supervisors: users.filter(u => u.role === 'supervisor').length,
      operators: users.filter(u => u.role === 'operator').length
    };
    
    res.json({
      success: true,
      company: {
        ...company.toPublicJSON(),
        userStats,
        paymentInfo: company.calculateTotalAmount(),
        isOverdue: company.isPaymentOverdue(),
        daysUntilBilling: company.getDaysUntilBilling()
      }
    });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

/**
 * POST /api/companies
 * Create new company (Super Admin only)
 */
router.post('/', authenticateToken, requirePermission('companies.create'), async (req, res) => {
  console.log('🚀 ROUTE HANDLER STARTED');
  console.log('🔍 Request body received:', JSON.stringify(req.body, null, 2));
  
  try {
    console.log('📦 Creating company - Extracting fields...');
    
    const {
      companyName,
      companyId,
      contactPerson,
      email,
      phone,
      adminName,
      adminPassword,
      address,
      deviceCount,
      pricePerDevice,
      billingCycle,
      planType,
      gstNumber,
      notes
    } = req.body;
    
    console.log('✅ Fields extracted successfully');
    
    // Validate required fields
    if (!companyName || !companyId || !contactPerson || !email || !phone || !adminName || !adminPassword) {
      return res.status(400).json({ 
        error: 'Company name, company ID, contact person, email, phone, admin name, and admin password are required' 
      });
    }
    
    // Validate password strength
    if (adminPassword.length < 6) {
      return res.status(400).json({ 
        error: 'Admin password must be at least 6 characters long' 
      });
    }
    
    // Check if company already exists
    const existingCompany = await Company.findOne({ 
      $or: [
        { companyName },
        { email },
        { companyId }
      ]
    });
    
    if (existingCompany) {
      return res.status(409).json({ 
        error: 'Company with this name, email, or company ID already exists' 
      });
    }
    
    // Check if user with this email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ 
        error: 'A user with this email already exists. Please use a different email for the admin.' 
      });
    }
    
    // Calculate next billing date
    const nextBillingDate = new Date();
    if (billingCycle === 'monthly') {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    } else if (billingCycle === 'quarterly') {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
    } else if (billingCycle === 'yearly') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    } else {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1); // Default monthly
    }
    
    // Create company
    console.log('🏗️ Creating Company instance...');
    console.log('📋 Company data:', {
      companyName,
      contactPerson,
      email,
      phone,
      deviceCount,
      pricePerDevice,
      billingCycle,
      planType
    });
    
    const company = new Company({
      companyName,
      companyId, // Now required - provided by super admin
      contactPerson,
      email,
      phone,
      address,
      subscription: {
        planType: planType || 'standard',
        status: 'trial',
        billingCycle: billingCycle || 'monthly',
        nextBillingDate
      },
      billing: {
        deviceCount: deviceCount || 0,
        pricePerDevice: pricePerDevice || 5000,
        gstNumber
      },
      notes,
      createdBy: req.user._id
    });
    
    console.log('💾 Saving company to database...');
    await company.save();
    console.log('✅ Company saved successfully!');
    console.log('📝 Company ID:', company._id);
    
    // Create admin user for this company
    console.log('👤 Creating admin user account...');
    // Note: Don't hash password manually - User model pre-save hook will handle it
    const adminUser = new User({
      name: adminName,
      email: email,
      passwordHash: adminPassword, // Will be hashed by pre-save hook
      role: 'admin',
      companyId: companyId, // Use the companyId string, not the company._id
      isActive: true
    });
    
    console.log('💾 Saving admin user to database...');
    await adminUser.save();
    console.log('✅ Admin user created successfully!');
    console.log('📧 Admin Email:', adminUser.email);
    console.log('🔑 Admin Role:', adminUser.role);
    
    // Update company with admin user reference
    company.adminUser = adminUser._id;
    await company.save();
    console.log('✅ Company updated with admin reference');
    
    res.status(201).json({
      success: true,
      message: 'Company and admin account created successfully',
      company: company.toPublicJSON(),
      adminCredentials: {
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        tempPassword: adminPassword // For Super Admin to share with client
      }
    });
  } catch (error) {
    console.error('❌ Create company error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      console.error('Validation errors:', errors);
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors 
      });
    }
    
    res.status(500).json({ 
      error: 'Company creation failed',
      message: error.message 
    });
  }
});

/**
 * PUT /api/companies/:id
 * Update company details (Super Admin only)
 */
router.put('/:id', authenticateToken, requirePermission('companies.update'), cacheInvalidation, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    const {
      companyName,
      contactPerson,
      email,
      phone,
      address,
      deviceCount,
      pricePerDevice,
      billingCycle,
      planType,
      gstNumber,
      notes,
      subscriptionStatus,
      isActive
    } = req.body;
    
    // Update basic info
    if (companyName) company.companyName = companyName;
    if (contactPerson) company.contactPerson = contactPerson;
    if (email) company.email = email;
    if (phone) company.phone = phone;
    if (address) company.address = address;
    if (notes !== undefined) company.notes = notes;
    
    // Update billing
    if (deviceCount !== undefined) company.billing.deviceCount = deviceCount;
    if (pricePerDevice !== undefined) company.billing.pricePerDevice = pricePerDevice;
    if (gstNumber !== undefined) company.billing.gstNumber = gstNumber;
    
    // Update subscription
    if (planType) company.subscription.planType = planType;
    if (billingCycle) company.subscription.billingCycle = billingCycle;
    if (subscriptionStatus) company.subscription.status = subscriptionStatus;
    
    // Update status
    if (isActive !== undefined) company.isActive = isActive;
    
    await company.save();
    
    res.json({
      success: true,
      message: 'Company updated successfully',
      company: company.toPublicJSON()
    });
  } catch (error) {
    console.error('Update company error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors 
      });
    }
    
    res.status(500).json({ error: 'Company update failed' });
  }
});

/**
 * POST /api/companies/:id/payment
 * Record payment for a company (Super Admin only)
 */
router.post('/:id/payment', authenticateToken, requirePermission('companies.billing'), cacheInvalidation, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    const { amount, paymentMethod, paymentDate } = req.body;
    
    if (!amount || !paymentMethod) {
      return res.status(400).json({ 
        error: 'Amount and payment method are required' 
      });
    }
    
    // Update payment status
    company.paymentStatus.lastPaymentDate = paymentDate || new Date();
    company.paymentStatus.lastPaymentAmount = amount;
    company.paymentStatus.paymentMethod = paymentMethod;
    company.paymentStatus.isPaid = true;
    company.paymentStatus.overdueAmount = 0;
    
    // Update next billing date
    const currentBillingDate = new Date(company.subscription.nextBillingDate);
    if (company.subscription.billingCycle === 'monthly') {
      currentBillingDate.setMonth(currentBillingDate.getMonth() + 1);
    } else if (company.subscription.billingCycle === 'quarterly') {
      currentBillingDate.setMonth(currentBillingDate.getMonth() + 3);
    } else if (company.subscription.billingCycle === 'yearly') {
      currentBillingDate.setFullYear(currentBillingDate.getFullYear() + 1);
    }
    company.subscription.nextBillingDate = currentBillingDate;
    
    // Activate subscription if trial
    if (company.subscription.status === 'trial') {
      company.subscription.status = 'active';
    }
    
    await company.save();
    
    res.json({
      success: true,
      message: 'Payment recorded successfully',
      company: company.toPublicJSON()
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

/**
 * DELETE /api/companies/:id
 * Delete/Deactivate company (Super Admin only)
 */
router.delete('/:id', authenticateToken, requirePermission('companies.delete'), cacheInvalidation, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    // Soft delete - just deactivate
    company.isActive = false;
    company.subscription.status = 'inactive';
    await company.save();
    
    // Also deactivate all users of this company
    await User.updateMany(
      { companyId: company._id },
      { isActive: false }
    );
    
    res.json({
      success: true,
      message: 'Company deactivated successfully'
    });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({ error: 'Failed to deactivate company' });
  }
});

/**
 * GET /api/companies/:id/users
 * Get all users of a company (Super Admin only)
 */
router.get('/:id/users', authenticateToken, requirePermission('companies.read'), smartCache, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    const users = await User.find({ companyId: company._id })
      .select('-passwordHash')
      .sort({ role: 1, name: 1 });
    
    res.json({
      success: true,
      company: {
        _id: company._id,
        companyName: company.companyName
      },
      count: users.length,
      users: users.map(u => u.toPublicJSON())
    });
  } catch (error) {
    console.error('Get company users error:', error);
    res.status(500).json({ error: 'Failed to fetch company users' });
  }
});

/**
 * DELETE /api/companies/:id
 * Delete company and all associated users (Super Admin only)
 */
router.delete('/:id', authenticateToken, requirePermission('companies.delete'), async (req, res) => {
  try {
    console.log('DELETE request received for company:', req.params.id);
    console.log('User making request:', req.user);
    
    const company = await Company.findById(req.params.id);
    
    if (!company) {
      console.log('Company not found:', req.params.id);
      return res.status(404).json({ error: 'Company not found' });
    }
    
    console.log('Found company:', company.companyName);
    
    // Delete all users associated with this company
    console.log('Deleting users for company:', company._id);
    const deletedUsers = await User.deleteMany({ companyId: company._id });
    console.log('Deleted users count:', deletedUsers.deletedCount);
    
    // Delete the company
    console.log('Deleting company:', req.params.id);
    await Company.findByIdAndDelete(req.params.id);
    console.log('Company deleted successfully');
    
    res.json({
      success: true,
      message: 'Company and all associated users deleted successfully'
    });
  } catch (error) {
    console.error('Delete company error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to delete company',
      message: error.message 
    });
  }
});

module.exports = router;

