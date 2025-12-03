const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Manually load .env
try {
    const envPath = path.resolve(__dirname, '.env');
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            }
            process.env[key] = value;
        }
    });
} catch (e) {
    console.error('Failed to load .env', e);
}

async function test() {
    try {
        const email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
        const key = process.env.GOOGLE_SHEETS_PRIVATE_KEY ? process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined;
        const sheetId = process.env.GOOGLE_SHEET_ID;

        console.log('Email:', email);
        console.log('Key exists:', !!key);
        console.log('Sheet ID:', sheetId);

        if (!email || !key) {
            console.error('Missing credentials');
            return;
        }

        const auth = new google.auth.JWT(
            email,
            undefined,
            key,
            ['https://www.googleapis.com/auth/spreadsheets']
        );

        await auth.authorize();
        console.log('Authorized successfully');

        const sheets = google.sheets({ version: 'v4', auth });
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Sheet1!A1:B2',
        });
        console.log('Success! Data:', res.data.values);
    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) {
            console.error('Full Error Response:', JSON.stringify(e.response.data, null, 2));
        }
    }
}

test();
