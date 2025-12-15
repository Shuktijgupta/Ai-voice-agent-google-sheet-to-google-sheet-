import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { initiateClickToCall, isClickToCallConfigured, formatPhoneNumber, isValidPhoneNumber } from '@/lib/click-to-call';

export async function POST(request: Request) {
    try {
        // Check if click-to-call is configured
        if (!isClickToCallConfigured()) {
            return NextResponse.json(
                { error: 'Click-to-call is not configured. Please set up Tata API credentials.' },
                { status: 503 }
            );
        }

        const body = await request.json();
        const { driverId, customerNumber, agentNumber, customData } = body;

        // Validate input
        if (!driverId && !customerNumber) {
            return NextResponse.json(
                { error: 'Either driverId or customerNumber is required' },
                { status: 400 }
            );
        }

        let phoneToCall = customerNumber;
        let driverData = null;

        // If driverId provided, fetch driver details
        if (driverId) {
            driverData = await prisma.driver.findUnique({
                where: { id: driverId },
                select: {
                    id: true,
                    name: true,
                    phone: true,
                    status: true,
                }
            });

            if (!driverData) {
                return NextResponse.json(
                    { error: 'Driver not found' },
                    { status: 404 }
                );
            }

            phoneToCall = driverData.phone;
        }

        // Validate phone number
        if (!isValidPhoneNumber(phoneToCall)) {
            return NextResponse.json(
                { error: 'Invalid phone number' },
                { status: 400 }
            );
        }

        // Format phone number
        const formattedPhone = formatPhoneNumber(phoneToCall);

        // Initiate the call
        const callResponse = await initiateClickToCall({
            customerNumber: formattedPhone,
            agentNumber,
            driverId,
            callType: 'click_to_call',
            customData: {
                ...customData,
                driverId: driverId || '',
                driverName: driverData?.name || '',
            },
        });

        if (!callResponse.success) {
            return NextResponse.json(
                { error: callResponse.error || 'Failed to initiate call' },
                { status: 500 }
            );
        }

        // Create call record in database
        const callRecord = await prisma.call.create({
            data: {
                driverId: driverId || undefined,
                blandCallId: callResponse.callId, // Using blandCallId field for any call ID
                status: 'calling',
                startTime: new Date(),
            },
        });

        // Update driver status if driverId provided
        if (driverId) {
            await prisma.driver.update({
                where: { id: driverId },
                data: { status: 'calling' },
            });
        }

        return NextResponse.json({
            success: true,
            callId: callResponse.callId,
            dbCallId: callRecord.id,
            status: 'initiated',
            message: callResponse.message,
            driver: driverData ? {
                id: driverData.id,
                name: driverData.name,
                phone: formattedPhone,
            } : null,
        });

    } catch (error) {
        console.error('Click-to-call initiate error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

