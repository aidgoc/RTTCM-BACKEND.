const mongoose = require('mongoose');
const { logger } = require('../middleware/errorHandler');

/**
 * Database Index Management Service
 * Provides utilities for managing database indexes in production
 */

class IndexService {
  // Get all indexes for a collection
  static async getCollectionIndexes(collectionName) {
    try {
      const collection = mongoose.connection.db.collection(collectionName);
      const indexes = await collection.indexes();
      
      logger.info('Retrieved collection indexes', {
        collection: collectionName,
        count: indexes.length,
        indexes: indexes.map(idx => ({
          name: idx.name,
          key: idx.key,
          unique: idx.unique,
          sparse: idx.sparse,
          partialFilterExpression: idx.partialFilterExpression
        }))
      });
      
      return indexes;
    } catch (error) {
      logger.error('Failed to get collection indexes', {
        collection: collectionName,
        error: error.message
      });
      throw error;
    }
  }

  // Get index statistics for performance analysis
  static async getIndexStats(collectionName) {
    try {
      const collection = mongoose.connection.db.collection(collectionName);
      const stats = await collection.aggregate([
        { $indexStats: {} }
      ]).toArray();
      
      logger.info('Retrieved index statistics', {
        collection: collectionName,
        stats: stats.map(stat => ({
          name: stat.name,
          accesses: stat.accesses,
          ops: stat.accesses?.ops || 0,
          since: stat.accesses?.since || null
        }))
      });
      
      return stats;
    } catch (error) {
      logger.error('Failed to get index statistics', {
        collection: collectionName,
        error: error.message
      });
      throw error;
    }
  }

  // Analyze query performance
  static async analyzeQuery(collectionName, query, options = {}) {
    try {
      const collection = mongoose.connection.db.collection(collectionName);
      const explainResult = await collection.find(query, options).explain('executionStats');
      
      const analysis = {
        collection: collectionName,
        query: query,
        executionTime: explainResult.executionStats?.executionTimeMillis || 0,
        totalDocsExamined: explainResult.executionStats?.totalDocsExamined || 0,
        totalDocsReturned: explainResult.executionStats?.totalDocsReturned || 0,
        indexUsed: explainResult.executionStats?.executionStages?.indexName || 'COLLSCAN',
        isIndexUsed: explainResult.executionStats?.executionStages?.stage !== 'COLLSCAN',
        efficiency: explainResult.executionStats?.totalDocsExamined / explainResult.executionStats?.totalDocsReturned || 0
      };
      
      logger.info('Query analysis completed', analysis);
      
      return analysis;
    } catch (error) {
      logger.error('Failed to analyze query', {
        collection: collectionName,
        query: query,
        error: error.message
      });
      throw error;
    }
  }

  // Get slow queries from database
  static async getSlowQueries() {
    try {
      const db = mongoose.connection.db;
      const profiler = db.collection('system.profile');
      
      const slowQueries = await profiler.find({
        ts: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
        millis: { $gte: 100 } // Queries taking more than 100ms
      }).sort({ ts: -1 }).limit(50).toArray();
      
      logger.info('Retrieved slow queries', {
        count: slowQueries.length,
        queries: slowQueries.map(q => ({
          command: q.command,
          millis: q.millis,
          ts: q.ts,
          ns: q.ns
        }))
      });
      
      return slowQueries;
    } catch (error) {
      logger.error('Failed to get slow queries', { error: error.message });
      throw error;
    }
  }

  // Create missing indexes based on query patterns
  static async createMissingIndexes(collectionName, indexSpecs) {
    try {
      const collection = mongoose.connection.db.collection(collectionName);
      const results = [];
      
      for (const spec of indexSpecs) {
        try {
          const result = await collection.createIndex(spec.keys, spec.options || {});
          results.push({ spec, result, success: true });
          
          logger.info('Created index successfully', {
            collection: collectionName,
            keys: spec.keys,
            options: spec.options
          });
        } catch (error) {
          results.push({ spec, error: error.message, success: false });
          
          logger.warn('Failed to create index', {
            collection: collectionName,
            keys: spec.keys,
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      logger.error('Failed to create missing indexes', {
        collection: collectionName,
        error: error.message
      });
      throw error;
    }
  }

  // Drop unused indexes
  static async dropUnusedIndexes(collectionName, unusedIndexNames) {
    try {
      const collection = mongoose.connection.db.collection(collectionName);
      const results = [];
      
      for (const indexName of unusedIndexNames) {
        try {
          await collection.dropIndex(indexName);
          results.push({ indexName, success: true });
          
          logger.info('Dropped unused index', {
            collection: collectionName,
            indexName: indexName
          });
        } catch (error) {
          results.push({ indexName, error: error.message, success: false });
          
          logger.warn('Failed to drop index', {
            collection: collectionName,
            indexName: indexName,
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      logger.error('Failed to drop unused indexes', {
        collection: collectionName,
        error: error.message
      });
      throw error;
    }
  }

  // Get database performance summary
  static async getPerformanceSummary() {
    try {
      const collections = ['cranes', 'users', 'tickets', 'telemetries', 'limittests'];
      const summary = {};
      
      for (const collectionName of collections) {
        try {
          const indexes = await this.getCollectionIndexes(collectionName);
          const stats = await this.getIndexStats(collectionName);
          
          summary[collectionName] = {
            totalIndexes: indexes.length,
            indexStats: stats.map(stat => ({
              name: stat.name,
              ops: stat.accesses?.ops || 0,
              since: stat.accesses?.since || null
            }))
          };
        } catch (error) {
          summary[collectionName] = { error: error.message };
        }
      }
      
      logger.info('Database performance summary generated', summary);
      return summary;
    } catch (error) {
      logger.error('Failed to generate performance summary', { error: error.message });
      throw error;
    }
  }

  // Optimize indexes based on usage patterns
  static async optimizeIndexes() {
    try {
      const collections = ['cranes', 'users', 'tickets', 'telemetries', 'limittests'];
      const optimizationResults = {};
      
      for (const collectionName of collections) {
        try {
          const stats = await this.getIndexStats(collectionName);
          const unusedIndexes = stats
            .filter(stat => stat.accesses?.ops === 0)
            .map(stat => stat.name);
          
          if (unusedIndexes.length > 0) {
            logger.warn('Found unused indexes', {
              collection: collectionName,
              unusedIndexes: unusedIndexes
            });
          }
          
          optimizationResults[collectionName] = {
            totalIndexes: stats.length,
            unusedIndexes: unusedIndexes.length,
            unusedIndexNames: unusedIndexes
          };
        } catch (error) {
          optimizationResults[collectionName] = { error: error.message };
        }
      }
      
      logger.info('Index optimization analysis completed', optimizationResults);
      return optimizationResults;
    } catch (error) {
      logger.error('Failed to optimize indexes', { error: error.message });
      throw error;
    }
  }
}

module.exports = IndexService;
