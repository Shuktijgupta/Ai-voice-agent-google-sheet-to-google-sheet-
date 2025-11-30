import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { call_id, completed, transcripts, summary, variables } = body;

        console.log('Bland Webhook Received:', call_id, completed);

        if (!call_id) {
            return NextResponse.json({ error: 'Missing call_id' }, { status: 400 });
        }

        // Find the call
        const call = await prisma.call.findUnique({
            where: { blandCallId: call_id },
        });

        if (!call) {
            console.error(`Call not found for Bland ID: ${call_id}`);
            return NextResponse.json({ error: 'Call not found' }, { status: 404 });
        }

        if (completed) {
            // Calculate duration if start/end times are available (Bland sends them, but let's just use current time as end for now or rely on their duration if provided)
            // Bland sends 'duration' in minutes usually, or we can just mark completed.

            const fullTranscript = transcripts ? transcripts.map((t: any) => `${t.user}: ${t.text}`).join('\n') : '';

            await prisma.call.update({
                where: { id: call.id },
                data: {
                    status: 'completed',
                    transcript: fullTranscript,
                    summary: summary || 'No summary provided.',
                    endTime: new Date(),
                },
            });

            await prisma.driver.update({
                where: { id: call.driverId },
                data: { status: 'completed' },
            });

            // If Bland extracts variables (answers), we could save them here too if we had a structured way.
            // For now, we just save the summary.
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
