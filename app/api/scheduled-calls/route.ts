import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET: Fetch scheduled calls
 * POST: Create a scheduled call
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const driverId = searchParams.get('driverId');

        const where: Record<string, unknown> = {};
        if (status) where.status = status;
        if (driverId) where.driverId = driverId;

        const scheduledCalls = await prisma.scheduledCall.findMany({
            where,
            include: {
                driver: { select: { id: true, name: true, phone: true } },
                agent: { select: { id: true, name: true } },
            },
            orderBy: { scheduledAt: 'asc' }
        });

        return NextResponse.json(scheduledCalls);
    } catch (error) {
        console.error('Failed to fetch scheduled calls:', error);
        return NextResponse.json(
            { error: 'Failed to fetch scheduled calls' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { driverId, agentId, scheduledAt, timezone = 'UTC', recurring, maxRetries = 3 } = body;

        if (!driverId || !scheduledAt) {
            return NextResponse.json(
                { error: 'driverId and scheduledAt are required' },
                { status: 400 }
            );
        }

        // Validate driver exists
        const driver = await prisma.driver.findUnique({ where: { id: driverId } });
        if (!driver) {
            return NextResponse.json(
                { error: 'Driver not found' },
                { status: 404 }
            );
        }

        const scheduledCall = await prisma.scheduledCall.create({
            data: {
                driverId,
                agentId: agentId || null,
                scheduledAt: new Date(scheduledAt),
                timezone,
                recurring: recurring || null,
                maxRetries,
                status: 'pending'
            },
            include: {
                driver: { select: { id: true, name: true, phone: true } },
                agent: { select: { id: true, name: true } },
            }
        });

        return NextResponse.json(scheduledCall, { status: 201 });
    } catch (error) {
        console.error('Failed to create scheduled call:', error);
        return NextResponse.json(
            { error: 'Failed to create scheduled call' },
            { status: 500 }
        );
    }
}






