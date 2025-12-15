import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCallStatus, isClickToCallConfigured } from '@/lib/click-to-call';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const callId = searchParams.get('callId');
        const dbCallId = searchParams.get('dbCallId');

        if (!callId && !dbCallId) {
            return NextResponse.json(
                { error: 'callId or dbCallId is required' },
                { status: 400 }
            );
        }

        // If dbCallId provided, fetch from database
        if (dbCallId) {
            const dbCall = await prisma.call.findUnique({
                where: { id: dbCallId },
                include: {
                    driver: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                        }
                    }
                }
            });

            if (!dbCall) {
                return NextResponse.json(
                    { error: 'Call not found in database' },
                    { status: 404 }
                );
            }

            // If we have the provider call ID, also fetch status from provider
            let providerStatus = null;
            if (dbCall.blandCallId && isClickToCallConfigured()) {
                providerStatus = await getCallStatus(dbCall.blandCallId);
            }

            return NextResponse.json({
                success: true,
                dbCall: {
                    id: dbCall.id,
                    status: dbCall.status,
                    startTime: dbCall.startTime,
                    endTime: dbCall.endTime,
                    duration: dbCall.durationSeconds,
                    transcript: dbCall.transcript,
                    summary: dbCall.summary,
                    recordingUrl: dbCall.recordingUrl,
                    driver: dbCall.driver,
                },
                providerStatus,
            });
        }

        // If only callId (provider call ID) provided
        if (!isClickToCallConfigured()) {
            return NextResponse.json(
                { error: 'Click-to-call is not configured' },
                { status: 503 }
            );
        }

        const status = await getCallStatus(callId!);

        if (!status) {
            return NextResponse.json(
                { error: 'Failed to get call status from provider' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            providerStatus: status,
        });

    } catch (error) {
        console.error('Click-to-call status error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

