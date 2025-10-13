const Joi = require('joi');

// Common validation schemas
const schemas = {
  craneId: Joi.string().pattern(/^TC-\d{3}$/).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required(),
  swl: Joi.number().min(1).max(100000).required(),
  load: Joi.number().min(0).max(10000).required(),
  utilization: Joi.number().min(0).max(100).required(),
  limitSwitch: Joi.string().valid('OK', 'FAIL', 'UNKNOWN').required(),
  severity: Joi.string().valid('low', 'warning', 'critical').required(),
  status: Joi.string().valid('open', 'in_progress', 'resolved', 'closed').required(),
  role: Joi.string().valid('admin', 'manager', 'supervisor', 'operator').required()
};

// Validation middleware factory
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }
    
    req[property] = value;
    next();
  };
};

// Specific validation schemas for different endpoints
const validationSchemas = {
  // Crane validation
  createCrane: Joi.object({
    craneId: schemas.craneId,
    name: Joi.string().min(2).max(100).required(),
    location: Joi.string().min(2).max(200).required(),
    swl: schemas.swl,
    managerUserId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
    operators: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).optional(),
    assignedSupervisors: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).optional(),
    specifications: Joi.object({
      manufacturer: Joi.string().max(100).optional(),
      model: Joi.string().max(100).optional(),
      maxHeight: Joi.number().min(1).max(1000).optional(),
      maxRadius: Joi.number().min(1).max(100).optional(),
      installationDate: Joi.date().max('now').optional()
    }).optional()
  }),

  updateCrane: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    location: Joi.string().min(2).max(200).optional(),
    swl: schemas.swl.optional(),
    managerUserId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
    operators: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).optional(),
    specifications: Joi.object({
      manufacturer: Joi.string().max(100).optional(),
      model: Joi.string().max(100).optional(),
      maxHeight: Joi.number().min(1).max(1000).optional(),
      maxRadius: Joi.number().min(1).max(100).optional(),
      installationDate: Joi.date().max('now').optional()
    }).optional()
  }),

  // User validation
  createUser: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: schemas.email,
    password: schemas.password,
    role: schemas.role,
    assignedCranes: Joi.array().items(schemas.craneId).optional()
  }),

  updateUser: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    email: schemas.email.optional(),
    password: schemas.password.optional(),
    role: schemas.role.optional(),
    assignedCranes: Joi.array().items(schemas.craneId).optional()
  }),

  // Telemetry validation
  telemetryData: Joi.object({
    craneId: schemas.craneId,
    ts: Joi.date().max('now').required(),
    load: schemas.load,
    swl: schemas.swl,
    ls1: schemas.limitSwitch,
    ls2: schemas.limitSwitch,
    ls3: schemas.limitSwitch,
    ls4: schemas.limitSwitch,
    util: schemas.utilization,
    ut: Joi.string().valid('OK', 'FAIL', 'UNKNOWN').optional(),
    raw: Joi.string().max(1000).required()
  }),

  // Ticket validation
  createTicket: Joi.object({
    craneId: schemas.craneId,
    type: Joi.string().min(2).max(50).required(),
    severity: schemas.severity,
    message: Joi.string().min(5).max(500).required(),
    assignedTo: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional()
  }),

  updateTicket: Joi.object({
    status: schemas.status,
    message: Joi.string().min(5).max(500).optional(),
    assignedTo: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
    resolution: Joi.string().max(500).optional()
  }),

  // Auth validation
  login: Joi.object({
    email: schemas.email,
    password: Joi.string().min(1).required()
  }),

  signup: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: schemas.email,
    password: schemas.password,
    role: schemas.role.optional()
  }),

  // Query parameters validation
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().max(100).optional(),
    status: Joi.string().valid('online', 'offline', 'overloaded', 'normal', 'warning').optional(),
    sortBy: Joi.string().valid('lastSeen', 'name', 'craneId', 'utilization').default('lastSeen'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),

  // Date range validation
  dateRange: Joi.object({
    from: Joi.date().max('now').optional(),
    to: Joi.date().max('now').optional(),
    limit: Joi.number().integer().min(1).max(10000).default(1000)
  })
};

module.exports = {
  validate,
  schemas: validationSchemas,
  commonSchemas: schemas
};
