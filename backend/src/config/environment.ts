// Environment configuration with validation
import dotenv from 'dotenv';
import Joi from 'joi';
import { EnvConfig } from '../types';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  
  PORT: Joi.number()
    .port()
    .default(3000),
    
  DATABASE_URL: Joi.string()
    .required()
    .description('PostgreSQL database URL'),
    
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .description('JWT secret key'),
    
  JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .required()
    .description('JWT refresh secret key'),
    
  JWT_EXPIRES_IN: Joi.string()
    .default('15m')
    .description('JWT expiration time'),
    
  JWT_REFRESH_EXPIRES_IN: Joi.string()
    .default('7d')
    .description('JWT refresh token expiration time'),
    
  CORS_ORIGIN: Joi.string()
    .default('http://localhost:3000')
    .description('CORS allowed origins'),
    
  RATE_LIMIT_WINDOW_MS: Joi.number()
    .integer()
    .min(1000)
    .default(900000) // 15 minutes
    .description('Rate limiting window in milliseconds'),
    
  RATE_LIMIT_MAX: Joi.number()
    .integer()
    .min(1)
    .default(100)
    .description('Maximum requests per window'),
    
  CLAUDE_FLOW_API_KEY: Joi.string()
    .optional()
    .description('Claude Flow API key'),
    
  CLAUDE_FLOW_ENDPOINT: Joi.string()
    .uri()
    .optional()
    .description('Claude Flow API endpoint'),
    
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'debug')
    .default('info')
    .description('Logging level'),
    
  BCRYPT_ROUNDS: Joi.number()
    .integer()
    .min(8)
    .max(15)
    .default(12)
    .description('BCrypt hashing rounds'),
    
  REDIS_URL: Joi.string()
    .optional()
    .description('Redis connection URL'),
    
  REDIS_PASSWORD: Joi.string()
    .optional()
    .allow('')
    .description('Redis password'),
    
  EMAIL_FROM: Joi.string()
    .email()
    .optional()
    .description('Email sender address'),
    
  EMAIL_PROVIDER: Joi.string()
    .valid('sendgrid', 'mailgun', 'ses')
    .optional()
    .description('Email service provider'),
    
  EMAIL_API_KEY: Joi.string()
    .optional()
    .description('Email service API key'),
    
  SESSION_SECRET: Joi.string()
    .min(32)
    .optional()
    .description('Session secret for cookies'),
    
  WS_PORT: Joi.number()
    .port()
    .default(3001)
    .description('WebSocket server port'),
    
  WS_CORS_ORIGIN: Joi.string()
    .default('http://localhost:3000')
    .description('WebSocket CORS allowed origins'),
}).unknown();

// Validate environment variables
const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  console.error('❌ Environment validation error:', error.details);
  process.exit(1);
}

// Export validated configuration
export const config: EnvConfig = {
  NODE_ENV: envVars.NODE_ENV,
  PORT: envVars.PORT,
  DATABASE_URL: envVars.DATABASE_URL,
  JWT_SECRET: envVars.JWT_SECRET,
  JWT_REFRESH_SECRET: envVars.JWT_REFRESH_SECRET,
  JWT_EXPIRES_IN: envVars.JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN: envVars.JWT_REFRESH_EXPIRES_IN,
  CORS_ORIGIN: envVars.CORS_ORIGIN,
  RATE_LIMIT_WINDOW_MS: envVars.RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX: envVars.RATE_LIMIT_MAX,
  CLAUDE_FLOW_API_KEY: envVars.CLAUDE_FLOW_API_KEY,
  CLAUDE_FLOW_ENDPOINT: envVars.CLAUDE_FLOW_ENDPOINT,
  LOG_LEVEL: envVars.LOG_LEVEL,
  BCRYPT_ROUNDS: envVars.BCRYPT_ROUNDS,
};

// Development mode check
export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';

// Feature flags based on environment
export const features = {
  // Enable detailed error messages in development
  detailedErrors: isDevelopment,
  
  // Enable API documentation in development
  apiDocs: isDevelopment,
  
  // Enable Prisma Studio in development
  prismaStudio: isDevelopment,
  
  // Enable debug logging in development
  debugLogs: isDevelopment,
  
  // Enable CORS in development, restrict in production
  corsEnabled: true,
  
  // Enable rate limiting (always on)
  rateLimiting: true,
  
  // Enable request logging
  requestLogging: true,
  
  // Enable security headers
  securityHeaders: true,
  
  // Enable compression
  compression: true,
  
  // Enable Claude Flow integration if API key is provided
  claudeFlowEnabled: Boolean(config.CLAUDE_FLOW_API_KEY),
  
  // Enable WebSocket server
  websocketEnabled: true,
  
  // Enable file uploads
  fileUploads: true,
  
  // Enable email notifications
  emailEnabled: Boolean(envVars.EMAIL_API_KEY),
  
  // Enable Redis caching
  redisEnabled: Boolean(envVars.REDIS_URL),
};

// Validate required features for production
if (isProduction) {
  const productionRequirements = [
    { feature: 'DATABASE_URL', value: config.DATABASE_URL },
    { feature: 'JWT_SECRET', value: config.JWT_SECRET },
    { feature: 'JWT_REFRESH_SECRET', value: config.JWT_REFRESH_SECRET },
  ];

  const missingRequirements = productionRequirements.filter(
    req => !req.value || req.value.length < 32
  );

  if (missingRequirements.length > 0) {
    console.error('❌ Production requirements not met:');
    missingRequirements.forEach(req => {
      console.error(`   - ${req.feature}: ${req.value ? 'Too short' : 'Missing'}`);
    });
    process.exit(1);
  }
}

// Export database configuration for Prisma
export const databaseConfig = {
  url: config.DATABASE_URL,
  shadowDatabaseUrl: envVars.SHADOW_DATABASE_URL,
};

// Export JWT configuration
export const jwtConfig = {
  secret: config.JWT_SECRET,
  refreshSecret: config.JWT_REFRESH_SECRET,
  expiresIn: config.JWT_EXPIRES_IN,
  refreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN,
  algorithm: 'HS256' as const,
  issuer: 'cybertask-api',
  audience: 'cybertask-client',
};

// Export CORS configuration
export const corsConfig = {
  origin: config.CORS_ORIGIN.split(',').map(origin => origin.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // 24 hours
};

// Export rate limiting configuration
export const rateLimitConfig = {
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    error: 'Rate limit exceeded',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for successful requests in development
  skipSuccessfulRequests: isDevelopment,
  // Skip rate limiting for failed requests in production
  skipFailedRequests: isProduction,
};

// Export Claude Flow configuration
export const claudeFlowConfig = {
  apiKey: config.CLAUDE_FLOW_API_KEY,
  endpoint: config.CLAUDE_FLOW_ENDPOINT || 'https://api.claude-flow.com',
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
};

// Export WebSocket configuration
export const websocketConfig = {
  port: envVars.WS_PORT,
  cors: {
    origin: envVars.WS_CORS_ORIGIN.split(',').map((origin: string) => origin.trim()),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e6, // 1MB
};

// Log configuration on startup
console.log('🔧 Configuration loaded:', {
  NODE_ENV: config.NODE_ENV,
  PORT: config.PORT,
  LOG_LEVEL: config.LOG_LEVEL,
  features: Object.entries(features)
    .filter(([_, enabled]) => enabled)
    .map(([feature]) => feature),
});

export default config;