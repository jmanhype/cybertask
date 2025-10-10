import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

const prisma = new PrismaClient();

// Global test setup
beforeAll(async () => {
  // Push the Prisma schema to the test database
  execSync('npx prisma db push --force-reset', {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
  });
});

// Global test teardown
afterAll(async () => {
  await prisma.$disconnect();
});

// Clean up database between tests
afterEach(async () => {
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>(
    `SELECT tablename FROM pg_tables WHERE schemaname='public'`
  );

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ');

  try {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
  } catch (error) {
    console.log({ error });
  }
});

export { prisma };