import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const payload = await request.json();
        const { message } = payload;

        if (!message) {
            return NextResponse.json({ message: 'No message found' }, { status: 200 });
        }

        // Handle End of Call Report
        if (message.type === 'end-of-call-report') {
            const { analysis, call, transcript, recordingUrl, summary } = message;
            const vapiCallId = call?.id;

            if (vapiCallId) {
                // Find the call record
                const existingCall = await prisma.call.findUnique({
                    where: { vapiCallId },
                });

                if (existingCall) {
                    // Update Call Record
                    await prisma.call.update({
                        where: { id: existingCall.id },
                        data: {
                            status: 'completed',
                            transcript: transcript,
                            summary: summary,
                            recordingUrl: recordingUrl,
                            endTime: new Date(),
                            durationSeconds: Math.round((Date.now() - existingCall.startTime.getTime()) / 1000), // Approximate
                        },
                    });

                    // Update Driver Status
                    await prisma.driver.update({
                        where: { id: existingCall.driverId },
                        data: { status: 'completed' },
                    });

                    // Save Interview Responses (if analysis exists)
                    if (analysis) {
                        // Assuming analysis is a key-value object or we parse the summary
                        // For now, let's try to extract structured data if Vapi provides it in 'structuredData' or similar
                        // Or we can just save the summary as a response for now.

                        // If Vapi returns structured extraction (which we can configure), we would loop through it.
                        // For this MVP, we'll assume the 'summary' is the main output.
                    }
                }
            }
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
