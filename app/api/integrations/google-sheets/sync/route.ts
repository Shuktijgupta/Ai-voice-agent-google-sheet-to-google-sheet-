import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSheetData, updateSheetRow } from '@/lib/google-sheets';
import { sendBlandCall } from '@/lib/bland';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const RANGE = 'Sheet1!A2:G'; // Reading columns A-G

export async function POST() {
    debugger;
    if (!SPREADSHEET_ID) {
        return NextResponse.json({ error: 'GOOGLE_SHEET_ID is not set' }, { status: 500 });
    }

    try {
        debugger;
        console.log('Starting sync with Sheet ID:', SPREADSHEET_ID);
        const rows = await getSheetData(SPREADSHEET_ID, RANGE);
        console.log(`Fetched ${rows.length} rows from sheet`);
        const results = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            // New mapping based on logs: Date, Phone, Name, Context, Status, CallId, Details
            const [date, phone, name, context, status, callId, details] = row;
            const rowIndex = i + 2; // 1-based index, +1 for header

            // Skip if already processed or missing essential data
            // Relaxed check: Allow empty status, 'Pending', 'pending', 'New', 'new'
            const normalizedStatus = status ? status.toLowerCase().trim() : '';
            if (!name || !phone) {
                console.log(`Skipping row ${rowIndex}: Missing name or phone`, { name, phone });
                continue;
            }

            if (normalizedStatus && !['pending', 'new'].includes(normalizedStatus)) {
                console.log(`Skipping row ${rowIndex}: Status is '${status}' (not Pending/New)`);
                continue;
            }

            // Check if driver already exists
            const existingDriver = await prisma.driver.findFirst({
                where: {
                    OR: [
                        { phone: phone },
                        { externalId: rowIndex.toString() }
                    ]
                }
            });

            if (existingDriver) {
                // Optionally update status if needed, but for now skip
                continue;
            }

            // Create Driver
            const driver = await prisma.driver.create({
                data: {
                    name,
                    phone,
                    source: 'google_sheets',
                    externalId: rowIndex.toString(),
                    status: 'calling',
                }
            });

            // Trigger Call (ElevenLabs or Bland AI)
            try {
                let newCallId: string;
                // Use Bland AI
                const callResponse = await sendBlandCall(phone, context || 'Default context');
                newCallId = callResponse.call_id;

                // Create Call record
                await prisma.call.create({
                    data: {
                        driverId: driver.id,
                        blandCallId: newCallId,
                        status: 'queued',
                    }
                });

                // Update Sheet (Status in E, Call ID in F)
                await updateSheetRow(SPREADSHEET_ID, `Sheet1!E${rowIndex}:F${rowIndex}`, ['Call Initiated', newCallId]);

                results.push({ name, phone, status: 'Call Initiated', callId: newCallId, provider: 'bland' });

            } catch (callError) {
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
