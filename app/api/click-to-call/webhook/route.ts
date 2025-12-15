import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseWebhookPayload, mapProviderStatus, CallEvent } from '@/lib/click-to-call';

/**
 * Webhook handler for Tata/telephony provider call events
 * 
 * This endpoint receives callbacks from the telephony provider
 * when call status changes (ringing, answered, completed, etc.)
 * 
 * SETUP:
 * 1. Set TATA_WEBHOOK_URL in your environment to point to this endpoint
 * 2. Configure Tata dashboard to send webhooks to this URL
 * 3. Optionally set TATA_WEBHOOK_SECRET for signature verification
 */

export async function POST(request: Request) {
    try {
        // Get raw body for signature verification
        const rawBody = await request.text();
        let payload: any;

        try {
            payload = JSON.parse(rawBody);
        } catch {
            return NextResponse.json(
                { error: 'Invalid JSON payload' },
                { status: 400 }
            );
        }

        // ============================================
        // 🔌 WEBHOOK SIGNATURE VERIFICATION PLACEHOLDER
        // ============================================
        // Add signature verification when you have Tata's webhook secret
        //
        // const signature = request.headers.get('x-tata-signature');
        // const webhookSecret = process.env.TATA_WEBHOOK_SECRET;
        // 
        // if (webhookSecret && signature) {
        //     const expectedSignature = crypto
        //         .createHmac('sha256', webhookSecret)
        //         .update(rawBody)
        //         .digest('hex');
        //     
        //     if (signature !== expectedSignature) {
        //         return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        //     }
        // }
        // ============================================

        // Parse the webhook payload
        const event = parseWebhookPayload(payload);

        if (!event) {
            console.error('Failed to parse webhook payload:', payload);
            return NextResponse.json(
                { error: 'Failed to parse webhook payload' },
                { status: 400 }
            );
        }

        console.log('Received click-to-call webhook:', {
            eventType: event.eventType,
            callId: event.callId,
            status: event.status,
        });

        // Find the call in our database
        const call = await prisma.call.findFirst({
            where: { blandCallId: event.callId },
            include: {
                driver: {
                    select: { id: true }
                }
            }
        });

        if (!call) {
            console.warn('Call not found for webhook:', event.callId);
            // Return 200 to prevent retries - call might be from different system
            return NextResponse.json({ received: true, warning: 'Call not found' });
        }

        // Map provider status to our status
        const mappedStatus = mapProviderStatus(event.status);

        // Determine final status based on event type
        let finalStatus = mappedStatus;
        if (event.eventType === 'call_ended') {
            finalStatus = event.hangupCause === 'busy' ? 'failed' : 'completed';
        } else if (event.eventType === 'call_failed') {
            finalStatus = 'failed';
        }

        // Update call record
        const updateData: any = {
            status: finalStatus,
        };

        // Add duration and end time if call ended
        if (['completed', 'failed', 'no_answer', 'busy', 'cancelled', 'rejected'].includes(finalStatus)) {
            updateData.endTime = event.timestamp ? new Date(event.timestamp) : new Date();
            if (event.duration) {
                updateData.durationSeconds = event.duration;
            }
        }

        // Add recording URL if available
        if (event.recording) {
            updateData.recordingUrl = event.recording;
        }

        // Update the call
        await prisma.call.update({
            where: { id: call.id },
            data: updateData,
        });

        // Update driver status if call ended
        if (call.driver && ['completed', 'failed', 'no_answer', 'busy'].includes(finalStatus)) {
            await prisma.driver.update({
                where: { id: call.driver.id },
                data: { 
                    status: finalStatus === 'completed' ? 'completed' : 'failed' 
                }
            });
        }

        // Return success
        return NextResponse.json({
            received: true,
            callId: event.callId,
            status: finalStatus,
        });

    } catch (error) {
        console.error('Click-to-call webhook error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

// Also handle GET for webhook verification (some providers use GET to verify URL)
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    
    // Handle verification challenge if provider sends one
    const challenge = searchParams.get('challenge') || searchParams.get('hub.challenge');
    if (challenge) {
        return new NextResponse(challenge, { status: 200 });
    }

    return NextResponse.json({ 
        status: 'ok',
        message: 'Click-to-call webhook endpoint is active',
        timestamp: new Date().toISOString(),
    });
}

