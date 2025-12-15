import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseElevenLabsWebhook } from '@/lib/elevenlabs';

/**
 * ElevenLabs Webhook Handler
 * Receives call status updates from ElevenLabs Conversational AI
 */
export async function POST(request: Request) {
    try {
        const payload = await request.json();
        console.log('ElevenLabs webhook received:', JSON.stringify(payload, null, 2));

        const parsed = parseElevenLabsWebhook(payload);

        if (!parsed.conversationId) {
            return NextResponse.json({ error: 'Missing conversation_id' }, { status: 400 });
        }

        // Find the call record by the conversation ID (stored in blandCallId field)
        const call = await prisma.call.findFirst({
            where: { blandCallId: parsed.conversationId },
            include: { driver: true },
        });

        if (!call) {
            console.warn('Call not found for conversation:', parsed.conversationId);
            return NextResponse.json({ received: true, matched: false });
        }

        // Map ElevenLabs status to our status
        let status = call.status;
        if (parsed.status === 'completed') {
            status = 'completed';
        } else if (parsed.status === 'failed') {
            status = 'failed';
        } else if (parsed.status === 'in-progress') {
            status = 'in-progress';
        }

        // Update call record
        await prisma.call.update({
            where: { id: call.id },
            data: {
                status,
                durationSeconds: parsed.duration || call.durationSeconds,
                transcript: parsed.transcript || call.transcript,
                recordingUrl: parsed.recordingUrl || call.recordingUrl,
                summary: parsed.summary || call.summary,
                endTime: status === 'completed' || status === 'failed' ? new Date() : call.endTime,
            },
        });

        // Update driver status if call ended
        if ((status === 'completed' || status === 'failed') && call.driverId) {
            await prisma.driver.update({
                where: { id: call.driverId },
                data: { status: status === 'completed' ? 'contacted' : 'new' },
            });
        }

        return NextResponse.json({ received: true, matched: true, callId: call.id });

    } catch (error) {
        console.error('ElevenLabs webhook error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * GET handler for webhook verification
 */
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        provider: 'elevenlabs',
        message: 'ElevenLabs webhook endpoint is active',
    });
}
