// src/middleware/errorHandler.js
const { ZodError } = require('zod');
const { Prisma } = require('@prisma/client');

// Custom Operational Application Error Class
class AppError extends Error {
  constructor(statusCode, message, errorCode = 'OPERATIONAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Asynchronous Route Handler Wrapper (Higher-Order Function)
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Centralized 4-Argument Error Boundary Middleware
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred.';
  let details = err.details || null;

  // 1. Zod Schema Validation Errors
  if (err instanceof ZodError) {
    statusCode = 400;
    errorCode = 'VALIDATION_FAILED';
    message = 'Request validation failed on one or more fields.';
    details = err.issues.map((e) => ({
      field: e.path.join('.'),
      rule: e.code,
      message: e.message
    }));
  }

  // 2. Prisma Database Constraint Violations
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      errorCode = 'DUPLICATE_RECORD';
      const target = err.meta && err.meta.target ? err.meta.target.join(', ') : 'field';
      message = `Unique constraint failed on the ${target}.`;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      errorCode = 'RECORD_NOT_FOUND';
      message = 'Target record does not exist or has been deleted.';
    } else if (err.code === 'P2003') {
      statusCode = 400;
      errorCode = 'FOREIGN_KEY_VIOLATION';
      message = 'Operation references an invalid relational foreign key.';
    }
  }

  // 3. Structured Error Response Payload
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    errorCode,
    message,
    details,
    requestId: req.id || null,
    timestamp: new Date().toISOString()
  });
};

module.exports = { AppError, asyncHandler, errorHandler };