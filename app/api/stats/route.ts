import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cache } from '@/lib/cache';

// Cache stats for 10 seconds to reduce DB load
const CACHE_TTL = 10000; // 10 seconds

export async function GET() {
    try {
        // Check cache
        const cacheKey = 'stats:all';
        const cached = cache.get(cacheKey);
        if (cached) {
            const response = NextResponse.json(cached);
            response.headers.set('X-Cache', 'HIT');
            response.headers.set('Cache-Control', 'private, max-age=10');
            return response;
        }

        // Use efficient aggregation queries
        const [
            totalDrivers,
            totalCalls,
            completedCalls,
            failedCalls,
            activeCalls,
            recentCalls
        ] = await Promise.all([
            prisma.driver.count(),
            prisma.call.count(),
            prisma.call.count({ where: { status: 'completed' } }),
            prisma.call.count({ where: { status: { in: ['failed', 'no-answer'] } } }),
            prisma.call.count({ where: { status: { in: ['queued', 'calling'] } } }),
            prisma.call.findMany({
                take: 5,
                orderBy: { startTime: 'desc' },
                select: {
                    id: true,
                    status: true,
                    startTime: true,
                    durationSeconds: true,
                    driver: { 
                        select: { name: true } 
                    }
                }
            })
        ]);

        const successRate = totalCalls > 0 
            ? Math.round((completedCalls / totalCalls) * 100) 
            : 0;

        const data = {
            totalDrivers,
            totalCalls,
            completedCalls,
            failedCalls,
            activeCalls,
            successRate,
            recentCalls: recentCalls.map(call => ({
                id: call.id,
                driverName: call.driver?.name || 'Unknown',
                status: call.status,
                startTime: call.startTime,
                duration: call.durationSeconds
            }))
        };

        // Update cache
        cache.set(cacheKey, data, CACHE_TTL);

        const response = NextResponse.json(data);
        response.headers.set('X-Cache', 'MISS');
        response.headers.set('Cache-Control', 'private, max-age=10');
        return response;
    } catch (error) {
        console.error('Failed to fetch stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stats' }, 
            { status: 500 }
        );
    }
}
