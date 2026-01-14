import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Bulk operations for drivers
 * POST /api/drivers/bulk
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { operation, driverIds, data } = body;

        if (!operation || !driverIds || !Array.isArray(driverIds) || driverIds.length === 0) {
            return NextResponse.json(
                { error: 'operation and driverIds array are required' },
                { status: 400 }
            );
        }

        let result: any;

        switch (operation) {
            case 'delete':
                result = await prisma.driver.deleteMany({
                    where: { id: { in: driverIds } }
                });
                break;

            case 'updateStatus':
                if (!data?.status) {
                    return NextResponse.json(
                        { error: 'status is required for updateStatus operation' },
                        { status: 400 }
                    );
                }
                result = await prisma.driver.updateMany({
                    where: { id: { in: driverIds } },
                    data: { status: data.status }
                });
                break;

            case 'initiateCalls':
                // Initiate calls for selected drivers
                const calls = [];
                for (const driverId of driverIds) {
                    try {
                        const driver = await prisma.driver.findUnique({ where: { id: driverId } });
                        if (!driver) continue;

                        const callResponse = await fetch(
                            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai-call/start`,
                            {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    driverId,
                                    agentId: data?.agentId || null
                                })
                            }
                        );

                        if (callResponse.ok) {
                            const callData = await callResponse.json();
                            calls.push({ driverId, success: true, callId: callData.callId });
                        } else {
                            calls.push({ driverId, success: false, error: await callResponse.text() });
                        }
                    } catch (error) {
                        calls.push({ driverId, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
                    }
                }
                result = { calls, total: driverIds.length, successful: calls.filter(c => c.success).length };
                break;

            case 'export':
                const drivers = await prisma.driver.findMany({
                    where: { id: { in: driverIds } },
                    include: {
                        calls: {
                            select: {
                                id: true,
                                status: true,
                                startTime: true,
                                durationSeconds: true
                            }
                        }
                    }
                });
                result = { drivers, total: drivers.length };
                break;

            default:
                return NextResponse.json(
                    { error: `Unknown operation: ${operation}` },
                    { status: 400 }
                );
        }

        return NextResponse.json({
            success: true,
            operation,
            result,
            processed: driverIds.length
        });
    } catch (error) {
        console.error('Bulk operation error:', error);
        return NextResponse.json(
            { error: 'Failed to perform bulk operation' },
            { status: 500 }
        );
    }
}






