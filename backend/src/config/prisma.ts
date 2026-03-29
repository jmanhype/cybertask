/**
 * Prisma Client Singleton
 *
 * This module ensures only one instance of PrismaClient is created
 * and reused across the application, preventing connection pool exhaustion.
 *
 * @see https://www.prisma.io/docs/guides/performance-and-optimization/connection-management
 */

import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// PrismaClient is attached to the global object in development
// to prevent hot-reloading from creating new instances
const globalForPrisma = global as unknown as { prisma: PrismaClient };

/**
 * Create PrismaClient with logging configuration
 */
const createPrismaClient = (): PrismaClient => {
  const client = new PrismaClient({
    log: [
      {
        emit: 'event',
        level: 'query',
      },
      {
        emit: 'event',
        level: 'error',
      },
      {
        emit: 'event',
        level: 'warn',
      },
    ],
  });

  // Hook into Prisma query logging
  client.$on('query' as never, ((event: any) => {
    logger.debug('Prisma Query:', {
      query: event.query,
      params: event.params,
      duration: `${event.duration}ms`,
    });
  }) as never);

  client.$on('error' as never, ((event: any) => {
    logger.error('Prisma Error:', event);
  }) as never);

  client.$on('warn' as never, ((event: any) => {
    logger.warn('Prisma Warning:', event);
  }) as never);

  return client;
};

/**
 * Singleton PrismaClient instance
 * In development, the instance is cached on the global object
 * to survive hot-reloads
 */
export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Graceful disconnect on process termination
 */
const gracefulShutdown = async () => {
  logger.info('Disconnecting Prisma Client...');
  await prisma.$disconnect();
  logger.info('Prisma Client disconnected');
};

process.on('beforeExit', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

export default prisma;
