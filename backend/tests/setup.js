"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const child_process_1 = require("child_process");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '.env.test' });
const prisma = new client_1.PrismaClient();
exports.prisma = prisma;
beforeAll(async () => {
    (0, child_process_1.execSync)('npx prisma db push --force-reset', {
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    });
});
afterAll(async () => {
    await prisma.$disconnect();
});
afterEach(async () => {
    const tablenames = await prisma.$queryRaw(`SELECT tablename FROM pg_tables WHERE schemaname='public'`);
    const tables = tablenames
        .map(({ tablename }) => tablename)
        .filter((name) => name !== '_prisma_migrations')
        .map((name) => `"public"."${name}"`)
        .join(', ');
    try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    }
    catch (error) {
        console.log({ error });
    }
});
//# sourceMappingURL=setup.js.map