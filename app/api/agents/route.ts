import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        console.log('Fetching agents...');
        const agents = await prisma.agent.findMany({
            orderBy: { createdAt: 'desc' },
        });
        console.log('Agents fetched:', agents);
        return NextResponse.json(agents);
    } catch (error: any) {
        console.error('Error fetching agents:', error);
        return NextResponse.json({ error: 'Failed to fetch agents', details: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, systemPrompt, questions } = body;

        const agent = await prisma.agent.create({
            data: {
                name,
                systemPrompt,
                questions: JSON.stringify(questions),
            },
        });

        return NextResponse.json(agent);
    } catch (error: any) {
        console.error('Error creating agent:', error);
        return NextResponse.json({ error: 'Failed to create agent', details: error.message }, { status: 500 });
    }
}
