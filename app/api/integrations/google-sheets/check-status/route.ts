import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateSheetRow } from '@/lib/google-sheets';
import { getCallDetails } from '@/lib/bland';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

export async function POST() {
    if (!SPREADSHEET_ID) {
        return NextResponse.json({ error: 'GOOGLE_SHEET_ID is not set' }, { status: 500 });
    }

    try {
        // Find active calls that need status updates
        const activeCalls = await prisma.call.findMany({
            where: {
                status: {
                    notIn: ['completed', 'failed', 'no-answer']
                },
                blandCallId: { not: null }
            },
            include: {
                driver: true
            }
        });

        const results = [];

        for (const call of activeCalls) {
            if (!call.blandCallId) continue;

            try {
                let details: any;

                if (call.blandCallId) {
                    // Check Bland AI Status
                    details = await getCallDetails(call.blandCallId);
                    console.log(`Bland Details for ${call.blandCallId}:`, JSON.stringify(details, null, 2));
                } else {
                    continue;
                }

                // Update DB
                await prisma.call.update({
                    where: { id: call.id },
                    data: {
                        status: details.status,
                        durationSeconds: details.duration_seconds,
                        summary: details.analysis?.summary || details.summary,
                        transcript: details.transcripts ? JSON.stringify(details.transcripts) : (details.analysis?.transcript || null),
                        price: details.price,
                        recordingUrl: details.recording_url,
                    }
                });

                // Update Driver Status
                if (details.status === 'completed') {
                    await prisma.driver.update({
                        where: { id: call.driverId },
                        data: { status: 'completed' }
                    });
                } else if (details.status === 'failed' || details.status === 'no-answer') {
                    await prisma.driver.update({
                        where: { id: call.driverId },
                        data: { status: 'failed' }
                    });
                }

                // Update Google Sheet if call is completed AND externalId exists
                if ((details.status === 'completed' || details.status === 'failed') && call.driver.externalId) {
                    const rowIndex = call.driver.externalId;
                    const summaryText = details.summary || 'No summary available';
                    const durationText = details.duration_seconds ? `${details.duration_seconds}s` : '';

                    await updateSheetRow(SPREADSHEET_ID, `Sheet1!E${rowIndex}:G${rowIndex}`, [
                        details.status,
                        call.blandCallId,
                        `Duration: ${durationText}. Summary: ${summaryText}`
                    ]);
                }

                results.push({ callId: call.blandCallId, status: details.status });

            } catch (error) {
                console.error(`Error updating call ${call.blandCallId}:`, error);
                results.push({ callId: call.blandCallId, error: String(error) });
            }
        }

        return NextResponse.json({ message: 'Status check complete', results });
    } catch (error) {
        console.error('Status check error:', error);
        return NextResponse.json({ error: 'Failed to check statuses' }, { status: 500 });
    }
}
