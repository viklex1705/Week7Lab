// src/server.js
const express = require('express');
const { corsMiddleware, requestTelemetry } = require('./middleware/cors');
const { errorHandler } = require('./middleware/errorHandler');
const { validate, createProductSchema, updateProductSchema, productQuerySchema, productIdParamSchema } = require('./schemas/product.schema');
const { getProducts } = require('./controllers/product.query');
const { createProduct, getProductById, updateProduct, deleteProduct } = require('./controllers/product.crud');
const prisma = require('./lib/prisma');

const app = express();
const PORT = process.env.PORT || 4000;

// 1. Application-Level Core Middleware Pipeline
app.use(corsMiddleware);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestTelemetry);

// 2. Health & Diagnostic Probe
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'catalog-api', timestamp: new Date().toISOString() });
});

// 3. Product Catalog Route Declarations with Schema Guards
app.get('/api/v1/products', validate(productQuerySchema, 'query'), getProducts);
app.post('/api/v1/products', validate(createProductSchema, 'body'), createProduct);
app.get('/api/v1/products/:id', validate(productIdParamSchema, 'params'), getProductById);
app.patch('/api/v1/products/:id', validate(productIdParamSchema, 'params'), validate(updateProductSchema, 'body'), updateProduct);
app.delete('/api/v1/products/:id', validate(productIdParamSchema, 'params'), deleteProduct);

// 4. Catch-All 404 Route Handler
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    errorCode: 'ROUTE_NOT_FOUND',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// 5. Centralized Error Boundary Middleware
app.use(errorHandler);

// 6. Server Initialization & Graceful Shutdown
const server = app.listen(PORT, () => {
  console.log(`[API GATEWAY ONLINE] Listening on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
});

const gracefulShutdown = async (signal) => {
  console.log(`[SHUTDOWN] Received ${signal}. Closing HTTP connections and database pools...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('[SHUTDOWN] Database connections drained. Process terminated safely.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));