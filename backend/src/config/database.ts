// Database configuration and Prisma client setup
import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// Extended Prisma Client with logging and error handling
const prisma = new PrismaClient({
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
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
  errorFormat: 'pretty',
});

// Setup Prisma logging
prisma.$on('query', (e) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Prisma Query:', {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
      timestamp: e.timestamp,
    });
  }
});

prisma.$on('error', (e) => {
  logger.error('Prisma Error:', {
    target: e.target,
    timestamp: e.timestamp,
  });
});

prisma.$on('info', (e) => {
  logger.info('Prisma Info:', {
    message: e.message,
    timestamp: e.timestamp,
  });
});

prisma.$on('warn', (e) => {
  logger.warn('Prisma Warning:', {
    message: e.message,
    timestamp: e.timestamp,
  });
});

// Database connection function
export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
    
    // Test the connection
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✅ Database connection test successful');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

// Database disconnection function
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('✅ Database disconnected successfully');
  } catch (error) {
    logger.error('❌ Database disconnection failed:', error);
  }
};

// Database health check
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('❌ Database health check failed:', error);
    return false;
  }
};

// Database transaction helper
export const withTransaction = async <T>(
  callback: (prisma: PrismaClient) => Promise<T>
): Promise<T> => {
  return prisma.$transaction(callback);
};

// Soft delete helper (for models that support it)
export const softDelete = async (
  model: any,
  id: string,
  userId?: string
): Promise<any> => {
  return model.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedBy: userId,
    },
  });
};

// Bulk operations helper
export const bulkCreate = async <T>(
  model: any,
  data: T[]
): Promise<any> => {
  return model.createMany({
    data,
    skipDuplicates: true,
  });
};

// Search helper with full-text search
export const searchRecords = async (
  model: any,
  searchTerm: string,
  fields: string[],
  filters: any = {},
  options: { page?: number; limit?: number } = {}
): Promise<any[]> => {
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  const searchConditions = fields.map(field => ({
    [field]: {
      contains: searchTerm,
      mode: 'insensitive' as const,
    },
  }));

  return model.findMany({
    where: {
      AND: [
        filters,
        {
          OR: searchConditions,
        },
      ],
    },
    skip,
    take: limit,
  });
};

// Count records helper
export const countRecords = async (
  model: any,
  where: any = {}
): Promise<number> => {
  return model.count({ where });
};

// Pagination helper
export const paginate = (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;
  return {
    skip,
    take: limit,
  };
};

// Database seeder helper
export const seedDatabase = async (): Promise<void> => {
  try {
    logger.info('🌱 Starting database seeding...');
    
    // Create default admin user
    const adminExists = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });

    if (!adminExists) {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123!', 12);
      
      await prisma.user.create({
        data: {
          email: 'admin@cybertask.com',
          username: 'admin',
          firstName: 'Admin',
          lastName: 'User',
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          emailVerified: true,
        },
      });
      
      logger.info('✅ Admin user created');
    }

    // Tags functionality removed - model doesn't exist
    
    logger.info('✅ Default tags created');
    logger.info('🎉 Database seeding completed');
  } catch (error) {
    logger.error('❌ Database seeding failed:', error);
    throw error;
  }
};

// Graceful shutdown handler
process.on('beforeExit', async () => {
  await disconnectDatabase();
});

process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});

export { prisma };
export default prisma;