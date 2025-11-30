import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const calls = await prisma.call.findMany({
            orderBy: {
                startTime: 'desc',
            },
            include: {
                driver: true,
                agent: true,
            },
        });
        return NextResponse.json(calls);
    } catch (error) {
        console.error('Failed to fetch calls:', error);
        return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 });
    }
}
