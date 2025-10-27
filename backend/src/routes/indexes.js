const express = require('express');
const IndexService = require('../services/indexService');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

// Apply authentication and admin role requirement to all routes
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Get all indexes for a collection
router.get('/:collection', asyncHandler(async (req, res) => {
  const { collection } = req.params;
  const indexes = await IndexService.getCollectionIndexes(collection);
  
  res.json({
    success: true,
    collection: collection,
    totalIndexes: indexes.length,
    indexes: indexes.map(idx => ({
      name: idx.name,
      key: idx.key,
      unique: idx.unique || false,
      sparse: idx.sparse || false,
      partialFilterExpression: idx.partialFilterExpression || null
    }))
  });
}));

// Get index statistics for performance analysis
router.get('/:collection/stats', asyncHandler(async (req, res) => {
  const { collection } = req.params;
  const stats = await IndexService.getIndexStats(collection);
  
  res.json({
    success: true,
    collection: collection,
    stats: stats.map(stat => ({
      name: stat.name,
      accesses: stat.accesses?.ops || 0,
      since: stat.accesses?.since || null,
      lastAccess: stat.accesses?.since ? new Date(stat.accesses.since) : null
    }))
  });
}));

// Analyze query performance
router.post('/:collection/analyze', asyncHandler(async (req, res) => {
  const { collection } = req.params;
  const { query, options } = req.body;
  
  if (!query) {
    return res.status(400).json({
      success: false,
      error: 'Query is required'
    });
  }
  
  const analysis = await IndexService.analyzeQuery(collection, query, options);
  
  res.json({
    success: true,
    analysis: analysis
  });
}));

// Get slow queries
router.get('/slow-queries', asyncHandler(async (req, res) => {
  const slowQueries = await IndexService.getSlowQueries();
  
  res.json({
    success: true,
    count: slowQueries.length,
    queries: slowQueries.map(q => ({
      command: q.command,
      millis: q.millis,
      timestamp: q.ts,
      namespace: q.ns,
      duration: `${q.millis}ms`
    }))
  });
}));

// Get database performance summary
router.get('/performance/summary', asyncHandler(async (req, res) => {
  const summary = await IndexService.getPerformanceSummary();
  
  res.json({
    success: true,
    summary: summary
  });
}));

// Optimize indexes based on usage patterns
router.post('/optimize', asyncHandler(async (req, res) => {
  const optimizationResults = await IndexService.optimizeIndexes();
  
  res.json({
    success: true,
    optimization: optimizationResults
  });
}));

// Create missing indexes
router.post('/:collection/create', asyncHandler(async (req, res) => {
  const { collection } = req.params;
  const { indexSpecs } = req.body;
  
  if (!indexSpecs || !Array.isArray(indexSpecs)) {
    return res.status(400).json({
      success: false,
      error: 'indexSpecs array is required'
    });
  }
  
  const results = await IndexService.createMissingIndexes(collection, indexSpecs);
  
  res.json({
    success: true,
    collection: collection,
    results: results
  });
}));

// Drop unused indexes
router.delete('/:collection/unused', asyncHandler(async (req, res) => {
  const { collection } = req.params;
  const { indexNames } = req.body;
  
  if (!indexNames || !Array.isArray(indexNames)) {
    return res.status(400).json({
      success: false,
      error: 'indexNames array is required'
    });
  }
  
  const results = await IndexService.dropUnusedIndexes(collection, indexNames);
  
  res.json({
    success: true,
    collection: collection,
    results: results
  });
}));

// Get index recommendations based on query patterns
router.get('/:collection/recommendations', asyncHandler(async (req, res) => {
  const { collection } = req.params;
  
  // This would typically analyze query patterns and suggest indexes
  // For now, we'll return a basic recommendation structure
  const recommendations = {
    collection: collection,
    recommendations: [
      {
        type: 'compound',
        fields: ['craneId', 'createdAt'],
        reason: 'Common query pattern for crane-specific data with time sorting',
        priority: 'high'
      },
      {
        type: 'text',
        fields: ['title', 'description'],
        reason: 'Full-text search capabilities',
        priority: 'medium'
      }
    ]
  };
  
  res.json({
    success: true,
    recommendations: recommendations
  });
}));

module.exports = router;
