import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateSheetRow, getSheetData } from '@/lib/google-sheets';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

interface BlandTranscript {
    user: string;
    text: string;
}

interface BlandWebhookPayload {
    call_id: string;
    completed: boolean;
    transcripts?: BlandTranscript[];
    summary?: string;
    variables?: Record<string, string>;
    analysis?: Record<string, string>;
    recording_url?: string;
    call_length?: number;
    status?: string;
    answered_by?: string;
    end_at?: string;
    price?: number;
}

export async function POST(request: Request) {
    try {
        const body: BlandWebhookPayload = await request.json();
        const { 
            call_id, 
            completed, 
            transcripts, 
            summary, 
            variables, 
            analysis,
            recording_url,
            call_length,
            status: callStatus,
            answered_by,
            price
        } = body;

        console.log('Bland Webhook Received:', { call_id, completed, callStatus });

        if (!call_id) {
            return NextResponse.json({ error: 'Missing call_id' }, { status: 400 });
        }

        // Find the call with driver info
        const call = await prisma.call.findUnique({
            where: { blandCallId: call_id },
            include: { driver: true }
        });

        if (!call) {
            console.error(`Call not found for Bland ID: ${call_id}`);
            return NextResponse.json({ error: 'Call not found' }, { status: 404 });
        }

        // Format transcript
        const fullTranscript = transcripts 
            ? transcripts.map((t) => `${t.user}: ${t.text}`).join('\n') 
            : '';

        // Determine final status
        const finalStatus = completed ? 'completed' : (callStatus || 'failed');

        // Update call record with all available data
        await prisma.call.update({
            where: { id: call.id },
            data: {
                status: finalStatus,
                transcript: fullTranscript || null,
                summary: summary || null,
                recordingUrl: recording_url || null,
                durationSeconds: call_length ? Math.round(call_length) : null,
                endTime: new Date(),
                answeredBy: answered_by || null,
                price: price || null,
                analysis: analysis ? JSON.stringify(analysis) : null,
                variables: variables ? JSON.stringify(variables) : null,
            },
        });

        // Update driver status
        await prisma.driver.update({
            where: { id: call.driverId },
            data: { status: finalStatus },
        });

        // Save interview responses if variables/analysis contains answers
        const answers = { ...variables, ...analysis };
        if (answers && Object.keys(answers).length > 0) {
            const responsePromises = Object.entries(answers).map(([questionId, answerText]) => 
                prisma.interviewResponse.create({
                    data: {
                        callId: call.id,
                        driverId: call.driverId,
                        questionId,
                        answerText: String(answerText),
                    }
                })
            );
            await Promise.all(responsePromises);
        }

        // Update Google Sheet if configured
        if (SPREADSHEET_ID && call.driver?.externalId) {
            try {
                const rowIndex = parseInt(call.driver.externalId);
                // Extract key data from analysis/summary
                const haltReason = answers?.halt_reason || answers?.haltage_reason || '';
                const location = answers?.location || answers?.current_location || '';
                const backOnRoad = answers?.eta || answers?.back_on_road || '';
                
                // Update columns E-J: Status, CallId, HaltReason, Location, BackOnRoad, Transcription
                await updateSheetRow(
                    SPREADSHEET_ID, 
                    `Sheet1!E${rowIndex}:J${rowIndex}`, 
                    [
                        finalStatus === 'completed' ? 'Completed' : 'Failed',
                        call_id,
                        haltReason,
                        location,
                        backOnRoad,
                        fullTranscript.substring(0, 50000) // Limit transcript length
                    ]
                );
                console.log(`Updated Google Sheet row ${rowIndex}`);
            } catch (sheetError) {
                console.error('Failed to update Google Sheet:', sheetError);
            }
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
