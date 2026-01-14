import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Server-Sent Events endpoint for real-time call updates
 * GET /api/calls/stream
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get('callId');
    const driverId = searchParams.get('driverId');

    // Create a readable stream for SSE
    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            
            // Send initial connection message
            const send = (data: object) => {
                const message = `data: ${JSON.stringify(data)}\n\n`;
                controller.enqueue(encoder.encode(message));
            };

            send({ type: 'connected', timestamp: new Date().toISOString() });

            // Poll for call updates
            const pollInterval = setInterval(async () => {
                try {
                    const where: Record<string, unknown> = {};
                    if (callId) where.id = callId;
                    if (driverId) where.driverId = driverId;
                    else where.status = { in: ['queued', 'calling', 'ringing'] };

                    const activeCalls = await prisma.call.findMany({
                        where,
                        orderBy: { startTime: 'desc' },
                        take: 10,
                        select: {
                            id: true,
                            driverId: true,
                            status: true,
                            startTime: true,
                            durationSeconds: true,
                            transcript: true,
                            driver: {
                                select: { id: true, name: true, phone: true }
                            },
                            agent: {
                                select: { id: true, name: true }
                            }
                        }
                    });

                    send({
                        type: 'update',
                        calls: activeCalls,
                        timestamp: new Date().toISOString()
                    });
                } catch (error) {
                    console.error('Error polling calls:', error);
                    send({ type: 'error', message: 'Failed to fetch updates' });
                }
            }, 2000); // Poll every 2 seconds

            // Cleanup on close
            request.signal.addEventListener('abort', () => {
                clearInterval(pollInterval);
                controller.close();
            });
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}






