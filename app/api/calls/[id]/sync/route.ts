import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCallDetails } from '@/lib/bland';

interface BlandResponse {
    call_id: string;
    status: string;
    completed?: boolean;
    duration?: number;
    duration_seconds?: number;
    summary?: string;
    transcript?: string;
    transcripts?: Array<{ user: string; text: string }>;
    recording_url?: string;
    price?: number;
    call_ended_by?: string;
    answered_by?: string;
    analysis?: Record<string, unknown>;
    variables?: Record<string, unknown>;
}

export async function POST(
    request: Request, 
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: callId } = await params;

        // Find the call in our DB
        const call = await prisma.call.findUnique({
            where: { id: callId },
            select: {
                id: true,
                blandCallId: true,
                driverId: true,
                transcript: true,
                summary: true,
                recordingUrl: true,
            }
        });

        if (!call || !call.blandCallId) {
            return NextResponse.json(
                { error: 'Call not found or missing Bland ID' }, 
                { status: 404 }
            );
        }

        // Fetch latest details from Bland AI
        const blandData = await getCallDetails(call.blandCallId) as BlandResponse;

        // Determine if call is completed
        const isCompleted = blandData.status === 'completed' || blandData.completed === true;
        const isFailed = blandData.status === 'failed' || blandData.status === 'no-answer';

        // Calculate duration (Bland returns duration_seconds or duration in minutes)
        let durationSeconds: number | undefined;
        if (blandData.duration_seconds) {
            durationSeconds = blandData.duration_seconds;
        } else if (blandData.duration) {
            durationSeconds = Math.round(blandData.duration * 60);
        }

        // Build transcript from transcripts array if available
        let transcript = call.transcript;
        if (blandData.transcripts && blandData.transcripts.length > 0) {
            transcript = blandData.transcripts
                .map(t => `${t.user}: ${t.text}`)
                .join('\n');
        } else if (blandData.transcript) {
            transcript = blandData.transcript;
        }

        // Update our DB
        const updatedCall = await prisma.call.update({
            where: { id: callId },
            data: {
                status: isCompleted ? 'completed' : isFailed ? 'failed' : blandData.status || 'calling',
                transcript,
                summary: blandData.summary || call.summary,
                durationSeconds,
                endTime: isCompleted || isFailed ? new Date() : undefined,
                recordingUrl: blandData.recording_url || call.recordingUrl,
                price: blandData.price,
                callEndedBy: blandData.call_ended_by,
                answeredBy: blandData.answered_by,
                analysis: blandData.analysis ? JSON.stringify(blandData.analysis) : undefined,
                variables: blandData.variables ? JSON.stringify(blandData.variables) : undefined,
            },
        });

        // Update driver status based on call outcome
        if (isCompleted || isFailed) {
            await prisma.driver.update({
                where: { id: call.driverId },
                data: { status: isCompleted ? 'completed' : 'failed' },
            });
        }

        return NextResponse.json({ success: true, call: updatedCall });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to sync call';
        console.error('Sync Error:', message);
        return NextResponse.json(
            { error: message }, 
            { status: 500 }
        );
    }
}
