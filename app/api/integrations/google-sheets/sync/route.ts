import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSheetData, updateSheetRow } from '@/lib/google-sheets';
import { sendBlandCall } from '@/lib/bland';
import { TRUCK_DRIVER_AGENT_CONFIG } from '@/lib/ai-agent-config';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const RANGE = 'Sheet1!A2:J'; // Reading columns A-J (including transcription)

export async function POST() {
    if (!SPREADSHEET_ID) {
        return NextResponse.json({ error: 'GOOGLE_SHEETS_SPREADSHEET_ID is not set' }, { status: 500 });
    }

    try {
        console.log('Starting sync with Sheet ID:', SPREADSHEET_ID);
        const rows = await getSheetData(SPREADSHEET_ID, RANGE);
        console.log(`Fetched ${rows.length} rows from sheet`);
        const results = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            // Column mapping: A=Date, B=Phone, C=Name, D=VehicleNo, E=Status, F=CallId, G=HaltReason, H=Location, I=BackOnRoad, J=Transcription
            const [date, phone, name, vehicleNo, status, existingCallId] = row;
            const rowIndex = i + 2; // 1-based index, +1 for header

            // Skip if missing essential data
            if (!name || !phone) {
                console.log(`Skipping row ${rowIndex}: Missing name or phone`);
                continue;
            }

            // Skip if already processed (has a call ID or status indicates completion)
            const normalizedStatus = status?.toLowerCase().trim() || '';
            if (existingCallId || ['completed', 'call initiated', 'failed'].includes(normalizedStatus)) {
                console.log(`Skipping row ${rowIndex}: Already processed (status: ${status})`);
                continue;
            }

            // Check if driver already exists by phone
            let driver = await prisma.driver.findFirst({
                where: { phone: phone.toString().trim() }
            });

            if (!driver) {
                // Create new driver
                driver = await prisma.driver.create({
                    data: {
                        name: name.trim(),
                        phone: phone.toString().trim(),
                        source: 'google_sheets',
                        externalId: rowIndex.toString(),
                        status: 'new',
                    }
                });
            }

            // Build task prompt for the call
            const taskPrompt = `${TRUCK_DRIVER_AGENT_CONFIG.systemPrompt}

You are calling ${name}. Vehicle: ${vehicleNo || 'Unknown'}.

Ask these questions one by one in Hindi:
${TRUCK_DRIVER_AGENT_CONFIG.questions.map(q => `- ${q.text}`).join('\n')}

After gathering information, thank them and end the call professionally.`;

            // Trigger Call via Bland AI
            try {
                const callResponse = await sendBlandCall({
                    phoneNumber: phone.toString(),
                    task: taskPrompt,
                    language: 'hi',
                });
                const newCallId = callResponse.call_id;

                // Update driver status
                await prisma.driver.update({
                    where: { id: driver.id },
                    data: { status: 'calling' }
                });

                // Create Call record
                await prisma.call.create({
                    data: {
                        driverId: driver.id,
                        blandCallId: newCallId,
                        status: 'queued',
                    }
                });

                // Update Sheet: Status (E) and Call ID (F)
                await updateSheetRow(SPREADSHEET_ID, `Sheet1!E${rowIndex}:F${rowIndex}`, ['Call Initiated', newCallId]);

                results.push({ name, phone, status: 'Call Initiated', callId: newCallId });
            } catch (callError: unknown) {
                console.error(`Failed to call ${name}:`, callError);
                await updateSheetRow(SPREADSHEET_ID, `Sheet1!E${rowIndex}`, ['Failed']);
                results.push({ name, phone, status: 'Failed', error: String(callError) });
            }
        }

        return NextResponse.json({ message: 'Sync complete', results });
    } catch (error) {
        console.error('Sync error:', error);
        return NextResponse.json({ error: 'Failed to sync with Google Sheets', details: String(error) }, { status: 500 });
    }
}
