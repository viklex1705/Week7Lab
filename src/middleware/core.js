// src/middleware/core.js
const cors = require('cors');
const crypto = require('crypto');

// 1. CORS Configuration: Strict Origin Whitelist & Method Restrictions
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl) or whitelisted origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy: Request origin not allowed.'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // Cache preflight OPTIONS responses for 24 hours
};

// 2. Custom Telemetry & Request ID Tracking Middleware
const requestTelemetry = (req, res, next) => {
  req.id = crypto.randomUUID();
  const startHrTime = process.hrtime();

  res.setHeader('X-Request-ID', req.id);

  res.on('finish', () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedMs = (elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6).toFixed(2);
    console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${elapsedMs}ms) [id: ${req.id}]`);
  });

  next();
};

module.exports = {
  corsMiddleware: cors(corsOptions),
  requestTelemetry
};