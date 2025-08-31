// Winston logger configuration
import winston from 'winston';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Configure colors
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    
    // Format metadata
    const metaStr = Object.keys(meta).length 
      ? `\n${JSON.stringify(meta, null, 2)}`
      : '';
    
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Define log format for files (without colors)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    
    // Format metadata
    const metaStr = Object.keys(meta).length 
      ? `\n${JSON.stringify(meta, null, 2)}`
      : '';
    
    return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}`;
  })
);

// Define transports
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    format: format,
    level: process.env.LOG_LEVEL || 'debug',
  }),
];

// Only add file transports in development
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    // Error log file
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  levels,
  format,
  transports,
  exitOnError: false,
});

// Create HTTP logger middleware
export const httpLogger = winston.createLogger({
  level: 'http',
  levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.printf((info) => {
      return `${info.timestamp} [HTTP]: ${info.message}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf((info) => {
          return `${info.timestamp} [${info.level}]: ${info.message}`;
        })
      ),
    }),
    ...(process.env.NODE_ENV !== 'production' ? [
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'http.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    ] : []),
  ],
});

// Database logger
export const dbLogger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.printf((info) => {
      const { timestamp, level, message, ...meta } = info;
      const metaStr = Object.keys(meta).length 
        ? `\n${JSON.stringify(meta, null, 2)}`
        : '';
      return `${timestamp} [DB-${level.toUpperCase()}]: ${message}${metaStr}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf((info) => {
          return `${info.timestamp} [${info.level}]: ${info.message}`;
        })
      ),
      level: process.env.NODE_ENV === 'development' ? 'debug' : 'error',
    }),
    ...(process.env.NODE_ENV !== 'production' ? [
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'database.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 3,
      })
    ] : []),
  ],
});

// Security logger for authentication events
export const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.printf((info) => {
      const { timestamp, level, message, ...meta } = info;
      const metaStr = Object.keys(meta).length 
        ? `\n${JSON.stringify(meta, null, 2)}`
        : '';
      return `${timestamp} [SECURITY-${level.toUpperCase()}]: ${message}${metaStr}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf((info) => {
          return `${info.timestamp} [${info.level}]: ${info.message}`;
        })
      ),
    }),
    ...(process.env.NODE_ENV !== 'production' ? [
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'security.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 10,
      })
    ] : []),
  ],
});

// Error handling for logger
logger.on('error', (error) => {
  console.error('Logger error:', error);
});

// Create logs directory if it doesn't exist (only in development)
import fs from 'fs';
if (process.env.NODE_ENV !== 'production') {
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

// Helper functions
export const logError = (error: Error, context?: any) => {
  logger.error(error.message, {
    stack: error.stack,
    context,
  });
};

export const logInfo = (message: string, meta?: any) => {
  logger.info(message, meta);
};

export const logWarn = (message: string, meta?: any) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: any) => {
  logger.debug(message, meta);
};

export const logHttp = (message: string, meta?: any) => {
  httpLogger.http(message, meta);
};

export const logSecurity = (event: string, meta?: any) => {
  securityLogger.info(event, meta);
};

// Express Morgan integration
export const morganFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms';

export const morganStream = {
  write: (message: string) => {
    httpLogger.http(message.trim());
  },
};

export default logger;