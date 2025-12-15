import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hangupCall, isClickToCallConfigured } from '@/lib/click-to-call';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { callId, dbCallId } = body;

        if (!callId && !dbCallId) {
            return NextResponse.json(
                { error: 'callId or dbCallId is required' },
                { status: 400 }
            );
        }

        let providerCallId = callId;

        // If dbCallId provided, fetch the provider call ID
        if (dbCallId) {
            const dbCall = await prisma.call.findUnique({
                where: { id: dbCallId },
                select: {
                    id: true,
                    blandCallId: true,
                    driverId: true,
                }
            });

            if (!dbCall) {
                return NextResponse.json(
                    { error: 'Call not found in database' },
                    { status: 404 }
                );
            }

            providerCallId = dbCall.blandCallId;

            // Update database immediately
            await prisma.call.update({
                where: { id: dbCallId },
                data: {
                    status: 'completed',
                    endTime: new Date(),
                }
            });

            // Update driver status
            if (dbCall.driverId) {
                await prisma.driver.update({
                    where: { id: dbCall.driverId },
                    data: { status: 'completed' }
                });
            }
        }

        // Hangup with provider
        if (providerCallId && isClickToCallConfigured()) {
            const hangupResponse = await hangupCall(providerCallId);
            
            if (!hangupResponse.success) {
                console.warn('Provider hangup failed:', hangupResponse.error);
                // Don't return error - call might already be ended
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Call ended successfully',
        });

    } catch (error) {
        console.error('Click-to-call hangup error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

