const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    }
  },
  craneId: {
    type: String,
    required: true,
    ref: 'Crane'
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  type: {
    type: String,
    required: true,
    enum: ['mechanical', 'electrical', 'safety', 'operational', 'maintenance', 'other'],
    default: 'operational'
  },
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    required: true,
    enum: ['open', 'in_progress', 'resolved', 'closed', 'cancelled'],
    default: 'open'
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  // Who created the ticket (operator)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    validate: {
      validator: async function(userId) {
        const User = mongoose.model('User');
        const user = await User.findById(userId);
        return user && user.role === 'operator';
      },
      message: 'Ticket creator must be an operator'
    }
  },
  // Who is assigned to handle the ticket (supervisor/manager)
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    validate: {
      validator: async function(userId) {
        if (!userId) return true; // Allow null/undefined
        const User = mongoose.model('User');
        const user = await User.findById(userId);
        return user && ['supervisor', 'manager', 'admin'].includes(user.role);
      },
      message: 'Ticket must be assigned to supervisor, manager, or admin'
    }
  },
  // Resolution details
  resolution: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  resolvedAt: {
    type: Date,
    required: false
  },
  // Attachments (images, documents)
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Comments/updates
  comments: [{
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    authorName: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isInternal: {
      type: Boolean,
      default: false // Internal comments only visible to supervisors/managers
    }
  }],
  // Estimated and actual time
  estimatedResolutionTime: {
    type: Number, // in hours
    required: false
  },
  actualResolutionTime: {
    type: Number, // in hours
    required: false
  },
  // Tags for categorization
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  // Due date
  dueDate: {
    type: Date,
    required: false
  },
  // Escalation
  escalated: {
    type: Boolean,
    default: false
  },
  escalatedAt: {
    type: Date,
    required: false
  },
  escalatedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: true
});

// =============================================================================
// COMPREHENSIVE INDEXING STRATEGY FOR PRODUCTION PERFORMANCE
// =============================================================================

// Primary indexes for efficient queries
ticketSchema.index({ craneId: 1 });
ticketSchema.index({ createdBy: 1 });
ticketSchema.index({ assignedTo: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ severity: 1 });
ticketSchema.index({ type: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ dueDate: 1 });

// Performance-optimized composite indexes
ticketSchema.index({ craneId: 1, status: 1 }); // Crane tickets by status
ticketSchema.index({ assignedTo: 1, status: 1 }); // User's tickets by status
ticketSchema.index({ createdBy: 1, status: 1 }); // Created tickets by status
ticketSchema.index({ status: 1, severity: 1 }); // Tickets by status and severity
ticketSchema.index({ status: 1, type: 1 }); // Tickets by status and type
ticketSchema.index({ status: 1, createdAt: -1 }); // Tickets by status and creation time
ticketSchema.index({ severity: 1, createdAt: -1 }); // Tickets by severity and creation time
ticketSchema.index({ type: 1, createdAt: -1 }); // Tickets by type and creation time

// Priority and due date indexes
ticketSchema.index({ priority: 1, dueDate: 1 }); // Priority and due date
ticketSchema.index({ dueDate: 1, status: 1 }); // Due date and status
ticketSchema.index({ priority: 1, status: 1, dueDate: 1 }); // Complex priority queries

// Search and filtering indexes
ticketSchema.index({ title: 1, status: 1 }); // Title search by status
ticketSchema.index({ description: 1, status: 1 }); // Description search by status
ticketSchema.index({ craneId: 1, status: 1, severity: 1 }); // Crane tickets by status and severity

// Text search index for full-text search
ticketSchema.index({ 
  title: 'text', 
  description: 'text',
  resolution: 'text'
}, { 
  weights: { 
    title: 10, 
    description: 5,
    resolution: 3
  },
  name: 'ticket_text_search'
});

// Aggregation pipeline optimization indexes
ticketSchema.index({ craneId: 1, status: 1, severity: 1, createdAt: -1 }); // Complex ticket aggregations
ticketSchema.index({ assignedTo: 1, status: 1, priority: 1, dueDate: 1 }); // User dashboard queries
ticketSchema.index({ createdBy: 1, status: 1, type: 1, createdAt: -1 }); // Creator dashboard queries

// Partial indexes for specific use cases
ticketSchema.index({ status: 1, createdAt: -1 }, { partialFilterExpression: { status: { $in: ['open', 'in_progress'] } } }); // Only open/in-progress tickets
ticketSchema.index({ dueDate: 1 }, { partialFilterExpression: { status: { $in: ['open', 'in_progress'] } } }); // Only active tickets by due date
ticketSchema.index({ priority: 1, dueDate: 1 }, { partialFilterExpression: { status: { $in: ['open', 'in_progress'] } } }); // Only active tickets by priority

// Sparse indexes for optional fields
ticketSchema.index({ assignedTo: 1 }, { sparse: true }); // Assigned tickets (sparse because not all tickets are assigned)
ticketSchema.index({ dueDate: 1 }, { sparse: true }); // Due date queries (sparse because not all tickets have due dates)
ticketSchema.index({ priority: 1 }, { sparse: true }); // Priority queries (sparse because not all tickets have priority)
ticketSchema.index({ resolution: 1 }, { sparse: true }); // Resolution queries (sparse because only resolved tickets have resolution)

// Virtual for age in hours
ticketSchema.virtual('ageInHours').get(function() {
  const now = new Date();
  const created = this.createdAt;
  return Math.floor((now - created) / (1000 * 60 * 60));
});

// Virtual for is overdue
ticketSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate) return false;
  return new Date() > this.dueDate && this.status !== 'closed' && this.status !== 'resolved';
});

// Virtual for is urgent
ticketSchema.virtual('isUrgent').get(function() {
  return this.severity === 'critical' || this.priority === 'urgent' || this.isOverdue;
});

// Instance method to add comment
ticketSchema.methods.addComment = function(text, author, authorName, isInternal = false) {
  this.comments.push({
    text,
    author,
    authorName,
    isInternal
  });
  return this.save();
};

// Instance method to assign ticket
ticketSchema.methods.assign = function(userId) {
  this.assignedTo = userId;
  this.status = 'in_progress';
  return this.save();
};

// Instance method to resolve ticket
ticketSchema.methods.resolve = function(resolution, resolvedBy) {
  this.status = 'resolved';
  this.resolution = resolution;
  this.resolvedBy = resolvedBy;
  this.resolvedAt = new Date();
  
  // Calculate actual resolution time
  if (this.createdAt) {
    const resolutionTime = (this.resolvedAt - this.createdAt) / (1000 * 60 * 60); // in hours
    this.actualResolutionTime = Math.round(resolutionTime * 100) / 100; // Round to 2 decimal places
  }
  
  return this.save();
};

// Instance method to escalate ticket
ticketSchema.methods.escalate = function(escalatedTo) {
  this.escalated = true;
  this.escalatedAt = new Date();
  this.escalatedTo = escalatedTo;
  this.priority = 'urgent';
  return this.save();
};

// Instance method to get summary
ticketSchema.methods.getSummary = function() {
  return {
    ticketId: this.ticketId,
    craneId: this.craneId,
    title: this.title,
    type: this.type,
    severity: this.severity,
    status: this.status,
    priority: this.priority,
    createdBy: this.createdBy,
    assignedTo: this.assignedTo,
    createdAt: this.createdAt,
    ageInHours: this.ageInHours,
    isOverdue: this.isOverdue,
    isUrgent: this.isUrgent,
    escalated: this.escalated
  };
};

// Static method to find tickets by crane
ticketSchema.statics.findByCrane = function(craneId) {
  return this.find({ craneId, status: { $ne: 'cancelled' } }).sort({ createdAt: -1 });
};

// Static method to find tickets by user
ticketSchema.statics.findByUser = function(userId, role) {
  let query = {};
  
  if (role === 'operator') {
    query = { createdBy: userId };
  } else if (role === 'supervisor' || role === 'manager' || role === 'admin') {
    query = { 
      $or: [
        { assignedTo: userId },
        { createdBy: { $exists: true } } // Can see all tickets
      ]
    };
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

// Static method to find overdue tickets
ticketSchema.statics.findOverdue = function() {
  return this.find({
    dueDate: { $lt: new Date() },
    status: { $nin: ['closed', 'resolved', 'cancelled'] }
  }).sort({ dueDate: 1 });
};

// Static method to find urgent tickets
ticketSchema.statics.findUrgent = function() {
  return this.find({
    $or: [
      { severity: 'critical' },
      { priority: 'urgent' },
      { dueDate: { $lt: new Date() } }
    ],
    status: { $nin: ['closed', 'resolved', 'cancelled'] }
  }).sort({ priority: 1, dueDate: 1 });
};

// Static method to get ticket statistics
ticketSchema.statics.getStats = function(craneIds, from, to) {
  let matchQuery = {};
  
  // Filter by crane IDs if provided
  if (craneIds && Array.isArray(craneIds) && craneIds.length > 0) {
    matchQuery.craneId = { $in: craneIds };
  }
  
  // Filter by date range if provided
  if (from || to) {
    matchQuery.createdAt = {};
    if (from) matchQuery.createdAt.$gte = new Date(from);
    if (to) matchQuery.createdAt.$lte = new Date(to);
  }
  
  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        open: {
          $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] }
        },
        inProgress: {
          $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
        },
        closed: {
          $sum: { $cond: [{ $in: ['$status', ['closed', 'resolved']] }, 1, 0] }
        },
        critical: {
          $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
        },
        warning: {
          $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] }
        },
        info: {
          $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] }
        },
        overload: {
          $sum: { $cond: [{ $eq: ['$type', 'overload'] }, 1, 0] }
        },
        limitSwitch: {
          $sum: { $cond: [{ $eq: ['$type', 'limitSwitch'] }, 1, 0] }
        },
        offline: {
          $sum: { $cond: [{ $eq: ['$type', 'offline'] }, 1, 0] }
        }
      }
    }
  ]);
};

// Static method to find recent tickets
ticketSchema.statics.findRecent = function(hours = 24, limit = 10) {
  const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({
    createdAt: { $gte: cutoffTime },
    status: { $nin: ['cancelled'] }
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .populate('createdBy', 'name email')
  .populate('assignedTo', 'name email');
};

// Pre-save middleware to set due date based on severity
ticketSchema.pre('save', function(next) {
  if (this.isNew && !this.dueDate) {
    const dueDateMap = {
      'critical': 2,    // 2 hours
      'high': 8,        // 8 hours
      'medium': 24,     // 24 hours
      'low': 72         // 72 hours
    };
    
    const hours = dueDateMap[this.severity] || 24;
    this.dueDate = new Date(Date.now() + hours * 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model('Ticket', ticketSchema);