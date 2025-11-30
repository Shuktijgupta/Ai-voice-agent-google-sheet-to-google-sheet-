import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const drivers = await prisma.driver.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                interviewResponses: true,
                calls: {
                    orderBy: { startTime: 'desc' },
                    take: 1
                }
            }
        });

        // Transform data to match frontend expectation
        const formattedDrivers = drivers.map((driver: any) => {
            const responses: Record<string, string> = {};
            if (driver.interviewResponses) {
                driver.interviewResponses.forEach((r: any) => {
                    if (r.questionId && r.answerText) {
                        responses[r.questionId] = r.answerText;
                    }
                });
            }
            return { ...driver, responses };
        });

        return NextResponse.json(formattedDrivers);
    } catch (error) {
        console.error('Failed to fetch drivers:', error);
        return NextResponse.json({ error: 'Failed to fetch drivers' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, phone, email } = body;

        const driver = await prisma.driver.create({
            data: {
                name,
                phone,
                email,
                status: 'new',
            },
        });

        return NextResponse.json(driver);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create driver' }, { status: 500 });
    }
}
