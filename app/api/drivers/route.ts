import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch all drivers with pagination
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '100')));
        const status = searchParams.get('status');
        const search = searchParams.get('search');

        // Build where clause
        const where: Record<string, unknown> = {};
        if (status && status !== 'all') {
            where.status = status;
        }
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { phone: { contains: search } },
                { email: { contains: search } },
            ];
        }

        const skip = (page - 1) * limit;

        // Parallel queries for better performance
        const [drivers, total] = await Promise.all([
            prisma.driver.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    name: true,
                    phone: true,
                    email: true,
                    status: true,
                    source: true,
                    externalId: true,
                    createdAt: true,
                    interviewResponses: {
                        select: {
                            questionId: true,
                            answerText: true,
                        }
                    },
                    calls: {
                        orderBy: { startTime: 'desc' },
                        take: 1,
                        select: {
                            id: true,
                            status: true,
                            transcript: true,
                            summary: true,
                            durationSeconds: true,
                            startTime: true,
                        }
                    }
                }
            }),
            prisma.driver.count({ where })
        ]);

        // Transform data efficiently
        const formattedDrivers = drivers.map((driver) => {
            const responses: Record<string, string> = {};
            driver.interviewResponses.forEach((r) => {
                if (r.questionId && r.answerText) {
                    responses[r.questionId] = r.answerText;
                }
            });
            return { ...driver, responses };
        });

        const response = NextResponse.json(formattedDrivers);
        response.headers.set('X-Total-Count', total.toString());
        response.headers.set('X-Page', page.toString());
        response.headers.set('X-Limit', limit.toString());
        response.headers.set('Cache-Control', 'private, max-age=5');
        
        return response;
    } catch (error) {
        console.error('Failed to fetch drivers:', error);
        return NextResponse.json(
            { error: 'Failed to fetch drivers' }, 
            { status: 500 }
        );
    }
}

// POST: Create new driver
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, phone, email } = body;

        // Basic validation
        if (!name || !phone) {
            return NextResponse.json(
                { error: 'Name and phone are required' }, 
                { status: 400 }
            );
        }

        // Clean phone number
        const cleanPhone = phone.replace(/[^\d+]/g, '');

        const driver = await prisma.driver.create({
            data: {
                name: name.trim(),
                phone: cleanPhone,
                email: email?.trim() || null,
                status: 'new',
                source: 'manual',
            },
        });

        return NextResponse.json(driver, { status: 201 });
    } catch (error) {
        console.error('Failed to create driver:', error);
        return NextResponse.json(
            { error: 'Failed to create driver' }, 
            { status: 500 }
        );
    }
}
