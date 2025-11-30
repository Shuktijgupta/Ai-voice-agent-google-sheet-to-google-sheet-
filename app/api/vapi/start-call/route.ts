import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { vapi } from '@/lib/vapi';

export async function POST(request: Request) {
    try {
        const { driverId } = await request.json();

        if (!driverId) {
            return NextResponse.json({ error: 'Driver ID is required' }, { status: 400 });
        }

        const driver = await prisma.driver.findUnique({
            where: { id: driverId },
        });

        if (!driver) {
            return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
        }

        // Start call via Vapi
        const vapiResponse = await vapi.startCall(driver.name, driver.phone);

        // Update driver status
        await prisma.driver.update({
            where: { id: driverId },
            data: { status: 'calling' },
        });

        // Create Call record
        await prisma.call.create({
            data: {
                driverId,
                status: 'initiated',
                vapiCallId: vapiResponse.id, // Save Vapi Call ID
            },
        });

        return NextResponse.json({ success: true, callId: vapiResponse.id });
    } catch (error: any) {
        console.error('Error starting call:', error);
        return NextResponse.json({ error: error.message || 'Failed to start call' }, { status: 500 });
    }
}
