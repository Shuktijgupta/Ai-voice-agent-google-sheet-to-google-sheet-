import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch calls with pagination and filtering
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
        const status = searchParams.get('status');
        const driverId = searchParams.get('driverId');

        // Build where clause
        const where: Record<string, unknown> = {};
        if (status) where.status = status;
        if (driverId) where.driverId = driverId;

        const skip = (page - 1) * limit;

        // Parallel queries for performance
        const [calls, total] = await Promise.all([
            prisma.call.findMany({
                where,
                orderBy: { startTime: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    blandCallId: true,
                    status: true,
                    startTime: true,
                    endTime: true,
                    durationSeconds: true,
                    recordingUrl: true,
                    transcript: true,
                    summary: true,
                    price: true,
                    driver: {
                        select: { 
                            id: true, 
                            name: true, 
                            phone: true 
                        }
                    },
                    agent: {
                        select: { 
                            id: true, 
                            name: true 
                        }
                    },
                },
            }),
            prisma.call.count({ where })
        ]);

        const response = NextResponse.json(calls);
        response.headers.set('X-Total-Count', total.toString());
        response.headers.set('X-Page', page.toString());
        response.headers.set('X-Limit', limit.toString());
        response.headers.set('Cache-Control', 'private, max-age=5');
        
        return response;
    } catch (error) {
        console.error('Failed to fetch calls:', error);
        return NextResponse.json(
            { error: 'Failed to fetch calls' }, 
            { status: 500 }
        );
    }
}
