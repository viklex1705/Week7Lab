// src/schemas/product.schema.js
const { z } = require('zod');

// Validation Middleware Generator Factory
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return next(result.error); // Forward ZodError directly to centralized error handler
  }
  req[source] = result.data; // Replace with clean, sanitized, and coerced data
  next();
};

// 1. Create Product Body Schema
const createProductSchema = z.object({
  title: z.string({ required_error: 'Title is required' })
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(150, 'Title cannot exceed 150 characters'),
  description: z.string().trim().max(1000).optional(),
  price: z.number({ required_error: 'Price is required' })
    .positive('Price must be strictly positive')
    .max(1000000, 'Price exceeds maximum allowable value'),
  stock: z.number().int('Stock must be an integer').nonnegative('Stock cannot be negative').default(0),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  merchantId: z.string().uuid('Merchant ID must be a valid UUID'),
  tagIds: z.array(z.string().uuid('Tag ID must be a valid UUID')).optional().default([])
});

// 2. Query Filtering, Pagination, and Sorting Schema
const productQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['price', 'createdAt', 'title', 'stock']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().trim().optional(),
  merchantId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional()
});

// 3. Route Parameter Schema
const productIdParamSchema = z.object({
  id: z.string().uuid('Product ID parameter must be a valid UUID')
});

module.exports = {
  validate,
  createProductSchema,
  updateProductSchema: createProductSchema.partial(),
  productQuerySchema,
  productIdParamSchema
};