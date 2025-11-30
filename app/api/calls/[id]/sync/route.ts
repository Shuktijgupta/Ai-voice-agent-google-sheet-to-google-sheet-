import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCallDetails } from '@/lib/bland';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: callId } = await params;

        // Find the call in our DB
        const call = await prisma.call.findUnique({
            where: { id: callId },
        });

        if (!call || !call.blandCallId) {
            return NextResponse.json({ error: 'Call not found or missing Bland ID' }, { status: 404 });
        }

        // Fetch latest details from Bland AI
        const blandData = await getCallDetails(call.blandCallId);

        // Update our DB
        const updatedCall = await prisma.call.update({
            where: { id: callId },
            data: {
                status: blandData.completed ? 'completed' : 'calling',
                transcript: blandData.transcripts ? blandData.transcripts.map((t: any) => `${t.user}: ${t.text}`).join('\n') : call.transcript,
                summary: blandData.summary || call.summary,
                durationSeconds: blandData.duration ? Math.round(blandData.duration * 60) : undefined,
                endTime: blandData.completed ? new Date() : undefined,
                recordingUrl: blandData.recording_url || call.recordingUrl,
                price: blandData.price,
                callEndedBy: blandData.call_ended_by,
                answeredBy: blandData.answered_by,
                analysis: blandData.analysis ? JSON.stringify(blandData.analysis) : undefined,
                variables: blandData.variables ? JSON.stringify(blandData.variables) : undefined,
            },
        });

        // Also update driver status if completed
        if (blandData.completed) {
            await prisma.driver.update({
                where: { id: call.driverId },
                data: { status: 'completed' },
            });
        }

        return NextResponse.json({ success: true, call: updatedCall });

    } catch (error: any) {
        console.error('Sync Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to sync call' }, { status: 500 });
    }
}
