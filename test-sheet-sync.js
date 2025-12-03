const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env' });

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const RANGE = 'Sheet1!A2:F';

async function getAuthClient() {
    const email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    let key = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

    if (!email || !key) {
        throw new Error('Missing Google Sheets credentials');
    }

    // Fix key formatting: ensure actual newlines
    key = key.replace(/\\n/g, '\n');

    console.log('Key Start:', key.substring(0, 30));
    console.log('Key End:', key.substring(key.length - 30));
    console.log('Key Length:', key.length);

    const auth = new google.auth.JWT({
        email,
        key,
        scopes: SCOPES,
    });

    await auth.authorize();
    return auth;
}

async function runSyncTest() {
    console.log('Starting Sync Test...');
    console.log('Spreadsheet ID:', SPREADSHEET_ID);

    if (!SPREADSHEET_ID) {
        console.error('GOOGLE_SHEET_ID is missing');
        return;
    }

    try {
        const auth = await getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });

        console.log(`Fetching range: ${RANGE}`);
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: RANGE,
        });

        const rows = response.data.values || [];
        console.log(`Fetched ${rows.length} rows.`);

        rows.forEach((row, index) => {
            const rowIndex = index + 2;
            console.log(`\nRow ${rowIndex} Raw:`, JSON.stringify(row));

            const [name, phone, context, status, callId, details] = row;

            console.log(`\nRow ${rowIndex}:`);
            console.log(`  Name: ${name}`);
            console.log(`  Phone: ${phone}`);
            console.log(`  Status: ${status}`);

            const normalizedStatus = status ? status.toLowerCase().trim() : '';

            if (!name || !phone) {
                console.log('  -> SKIPPED: Missing name or phone');
                return;
            }

            if (normalizedStatus && !['pending', 'new'].includes(normalizedStatus)) {
                console.log(`  -> SKIPPED: Status '${status}' is not pending/new`);
                return;
            }

            console.log('  -> WOULD PROCESS: Valid row for sync');
        });

    } catch (error) {
        console.error('Sync Test Failed:', error);
    }
}

runSyncTest();
