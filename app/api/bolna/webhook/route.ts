import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseBolnaWebhook } from '@/lib/bolna';

/**
 * Bolna Webhook Handler
 * Receives call status updates from Bolna server
 */
export async function POST(request: Request) {
    try {
        const payload = await request.json();
        console.log('Bolna webhook received:', JSON.stringify(payload, null, 2));

        const parsed = parseBolnaWebhook(payload);

        if (!parsed.callId) {
            return NextResponse.json({ error: 'Missing call_id' }, { status: 400 });
        }

        // Find the call record by the call ID (stored in blandCallId field)
        const call = await prisma.call.findFirst({
            where: { blandCallId: parsed.callId },
            include: { driver: true },
        });

        if (!call) {
            console.warn('Call not found for Bolna call:', parsed.callId);
            return NextResponse.json({ received: true, matched: false });
        }

        // Map Bolna status to our status
        let status = call.status;
        const bolnaStatus = parsed.status.toLowerCase();
        
        if (bolnaStatus === 'completed' || bolnaStatus === 'done') {
            status = 'completed';
        } else if (bolnaStatus === 'failed' || bolnaStatus === 'error') {
            status = 'failed';
        } else if (bolnaStatus === 'in-progress' || bolnaStatus === 'active') {
            status = 'in-progress';
        } else if (bolnaStatus === 'no-answer' || bolnaStatus === 'busy') {
            status = 'no-answer';
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
        if ((status === 'completed' || status === 'failed' || status === 'no-answer') && call.driverId) {
            await prisma.driver.update({
                where: { id: call.driverId },
                data: { status: status === 'completed' ? 'contacted' : 'new' },
            });
        }

        return NextResponse.json({ received: true, matched: true, callId: call.id });

    } catch (error) {
        console.error('Bolna webhook error:', error);
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
        provider: 'bolna',
        message: 'Bolna webhook endpoint is active',
    });
}
