const express = require('express');
const LimitTest = require('../models/LimitTest');
const Crane = require('../models/Crane');
const { requireRole, requireCraneAccess, requireCraneManagement } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/limit-tests
 * Get limit tests for cranes (filtered by user role)
 */
router.get('/', requireCraneAccess, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      craneId, 
      testStatus, 
      testType,
      from,
      to,
      overdue = false 
    } = req.query;
    
    const skip = (page - 1) * limit;
    
    // Build query
    let query = {};
    
    // Filter by crane access
    if (req.user.role === 'operator') {
      query.craneId = { $in: req.user.assignedCranes || [] };
    } else if (req.user.role === 'manager') {
      query.craneId = { $in: req.user.managedCranes || [] };
    }
    
    // Additional filters
    if (craneId) {
      query.craneId = craneId;
    }
    
    if (testStatus) {
      query.testStatus = testStatus;
    }
    
    if (testType) {
      query.testType = testType;
    }
    
    if (from || to) {
      query.testDate = {};
      if (from) query.testDate.$gte = new Date(from);
      if (to) query.testDate.$lte = new Date(to);
    }
    
    if (overdue === 'true') {
      query.nextTestDue = { $lt: new Date() };
      query.testStatus = { $ne: 'in_progress' };
    }
    
    // Get tests with pagination
    const tests = await LimitTest.find(query)
      .populate('performedBy', 'name email')
      .sort({ testDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const total = await LimitTest.countDocuments(query);
    
    res.json({
      tests: tests.map(test => test.getTestSummary()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get limit tests error:', error);
    res.status(500).json({ error: 'Failed to fetch limit tests' });
  }
});

/**
 * GET /api/limit-tests/:id
 * Get specific limit test details
 */
router.get('/:id', requireCraneAccess, async (req, res) => {
  try {
    const test = await LimitTest.findById(req.params.id)
      .populate('performedBy', 'name email');
    
    if (!test) {
      return res.status(404).json({ error: 'Limit test not found' });
    }
    
    // Check access
    if (req.user.role === 'operator' && !req.user.assignedCranes?.includes(test.craneId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (req.user.role === 'manager' && !req.user.managedCranes?.includes(test.craneId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(test);
  } catch (error) {
    console.error('Get limit test error:', error);
    res.status(500).json({ error: 'Failed to fetch limit test' });
  }
});

/**
 * POST /api/limit-tests
 * Create new limit test (admin/manager only)
 */
router.post('/', requireCraneManagement, async (req, res) => {
  try {
    const {
      craneId,
      testType = 'manual',
      limitSwitches,
      utilityTest,
      testData,
      testDuration,
      nextTestDue,
      maintenanceNotes
    } = req.body;
    
    // Verify crane exists and user has access
    const crane = await Crane.findOne({ craneId, isActive: true });
    if (!crane) {
      return res.status(404).json({ error: 'Crane not found' });
    }
    
    // Calculate test results
    const criticalFailures = [];
    const warnings = [];
    const recommendations = [];
    
    // Check limit switches
    Object.entries(limitSwitches).forEach(([key, switchData]) => {
      if (switchData.status === 'FAIL') {
        criticalFailures.push(`${key.toUpperCase()} failed`);
      } else if (switchData.status === 'UNKNOWN') {
        warnings.push(`${key.toUpperCase()} status unknown`);
      }
      
      if (switchData.responseTime > 1000) { // > 1 second
        warnings.push(`${key.toUpperCase()} slow response time`);
      }
    });
    
    // Check utility test
    if (utilityTest.status === 'FAIL') {
      criticalFailures.push('Utility system failed');
    }
    
    if (utilityTest.powerLevel < 80) {
      warnings.push('Low power level detected');
    }
    
    // Generate recommendations
    if (criticalFailures.length > 0) {
      recommendations.push('Immediate maintenance required');
    }
    
    if (warnings.length > 2) {
      recommendations.push('Schedule preventive maintenance');
    }
    
    const overallPassed = criticalFailures.length === 0;
    
    const test = new LimitTest({
      craneId,
      testType,
      testDate: new Date(),
      testStatus: overallPassed ? 'passed' : 'failed',
      limitSwitches,
      utilityTest,
      testResults: {
        overallPassed,
        criticalFailures,
        warnings,
        recommendations
      },
      testData,
      performedBy: req.user.id,
      testDuration,
      nextTestDue: new Date(nextTestDue),
      maintenanceRequired: criticalFailures.length > 0,
      maintenanceNotes
    });
    
    await test.save();
    
    res.status(201).json({
      message: 'Limit test created successfully',
      test: test.getTestSummary()
    });
  } catch (error) {
    console.error('Create limit test error:', error);
    res.status(500).json({ error: 'Failed to create limit test' });
  }
});

/**
 * PUT /api/limit-tests/:id
 * Update limit test (admin/manager only)
 */
router.put('/:id', requireCraneManagement, async (req, res) => {
  try {
    const test = await LimitTest.findById(req.params.id);
    
    if (!test) {
      return res.status(404).json({ error: 'Limit test not found' });
    }
    
    // Check access
    if (req.user.role === 'manager' && !req.user.managedCranes?.includes(test.craneId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updates = req.body;
    
    // Recalculate test results if limit switches or utility test updated
    if (updates.limitSwitches || updates.utilityTest) {
      const criticalFailures = [];
      const warnings = [];
      const recommendations = [];
      
      const limitSwitches = updates.limitSwitches || test.limitSwitches;
      const utilityTest = updates.utilityTest || test.utilityTest;
      
      // Check limit switches
      Object.entries(limitSwitches).forEach(([key, switchData]) => {
        if (switchData.status === 'FAIL') {
          criticalFailures.push(`${key.toUpperCase()} failed`);
        } else if (switchData.status === 'UNKNOWN') {
          warnings.push(`${key.toUpperCase()} status unknown`);
        }
      });
      
      // Check utility test
      if (utilityTest.status === 'FAIL') {
        criticalFailures.push('Utility system failed');
      }
      
      updates.testResults = {
        overallPassed: criticalFailures.length === 0,
        criticalFailures,
        warnings,
        recommendations: criticalFailures.length > 0 ? ['Immediate maintenance required'] : []
      };
      
      updates.testStatus = criticalFailures.length === 0 ? 'passed' : 'failed';
      updates.maintenanceRequired = criticalFailures.length > 0;
    }
    
    Object.assign(test, updates);
    await test.save();
    
    res.json({
      message: 'Limit test updated successfully',
      test: test.getTestSummary()
    });
  } catch (error) {
    console.error('Update limit test error:', error);
    res.status(500).json({ error: 'Failed to update limit test' });
  }
});

/**
 * DELETE /api/limit-tests/:id
 * Delete limit test (admin only)
 */
router.delete('/:id', requireCraneManagement, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const test = await LimitTest.findByIdAndDelete(req.params.id);
    
    if (!test) {
      return res.status(404).json({ error: 'Limit test not found' });
    }
    
    res.json({ message: 'Limit test deleted successfully' });
  } catch (error) {
    console.error('Delete limit test error:', error);
    res.status(500).json({ error: 'Failed to delete limit test' });
  }
});

/**
 * GET /api/limit-tests/crane/:craneId
 * Get limit tests for specific crane
 */
router.get('/crane/:craneId', requireCraneAccess, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const craneId = req.params.craneId;
    
    // Check access
    if (req.user.role === 'operator' && !req.user.assignedCranes?.includes(craneId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (req.user.role === 'manager' && !req.user.managedCranes?.includes(craneId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const tests = await LimitTest.getCraneTests(craneId, parseInt(limit));
    
    res.json({
      craneId,
      tests: tests.map(test => test.getTestSummary())
    });
  } catch (error) {
    console.error('Get crane limit tests error:', error);
    res.status(500).json({ error: 'Failed to fetch crane limit tests' });
  }
});

/**
 * GET /api/limit-tests/stats/overdue
 * Get overdue limit tests
 */
router.get('/stats/overdue', requireCraneAccess, async (req, res) => {
  try {
    const overdueTests = await LimitTest.getOverdueTests();
    
    res.json({
      count: overdueTests.length,
      tests: overdueTests.map(test => test.getTestSummary())
    });
  } catch (error) {
    console.error('Get overdue tests error:', error);
    res.status(500).json({ error: 'Failed to fetch overdue tests' });
  }
});

/**
 * GET /api/limit-tests/stats/upcoming
 * Get upcoming limit tests
 */
router.get('/stats/upcoming', requireCraneAccess, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const upcomingTests = await LimitTest.getUpcomingTests(parseInt(days));
    
    res.json({
      count: upcomingTests.length,
      tests: upcomingTests.map(test => test.getTestSummary())
    });
  } catch (error) {
    console.error('Get upcoming tests error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming tests' });
  }
});

/**
 * GET /api/limit-tests/stats/:craneId
 * Get limit test statistics for a crane
 */
router.get('/stats/:craneId', requireCraneAccess, async (req, res) => {
  try {
    const { from, to } = req.query;
    const craneId = req.params.craneId;
    
    // Check access
    if (req.user.role === 'operator' && !req.user.assignedCranes?.includes(craneId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (req.user.role === 'manager' && !req.user.managedCranes?.includes(craneId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const stats = await LimitTest.getTestStats(craneId, from, to);
    
    res.json({
      craneId,
      stats: stats[0] || {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        avgTestDuration: 0,
        maintenanceRequired: 0
      }
    });
  } catch (error) {
    console.error('Get limit test stats error:', error);
    res.status(500).json({ error: 'Failed to fetch limit test statistics' });
  }
});

module.exports = router;
