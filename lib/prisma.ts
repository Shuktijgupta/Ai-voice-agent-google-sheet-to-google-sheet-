import { PrismaClient } from '@prisma/client';

// PrismaClient singleton pattern for serverless/edge environments
const globalForPrisma = globalThis as unknown as { 
    prisma: PrismaClient | undefined;
};

// Configure connection pool for production
const prismaClientSingleton = () => {
    return new PrismaClient({
        log: process.env.NODE_ENV === 'development' 
            ? ['error', 'warn'] 
            : ['error'],
        // Connection pool settings are configured via DATABASE_URL
        // For SQLite, pooling is handled automatically
        // For PostgreSQL, add ?connection_limit=5&pool_timeout=10 to DATABASE_URL
    });
};

// Use existing client or create new one
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

// Graceful shutdown handler for serverless
export async function disconnectPrisma() {
    await prisma.$disconnect();
}

// For edge runtime compatibility
export const runtime = 'nodejs';
