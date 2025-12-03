import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export async function getAuthClient() {
    const email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    const key = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!email || !key) {
        throw new Error('Missing Google Sheets credentials');
    }

    const auth = new google.auth.JWT({
        email,
        key,
        scopes: SCOPES,
    });

    try {
        const token = await auth.authorize();
        console.log('Google Auth Success. Token obtained.');
    } catch (e) {
        console.error('Google Auth Failed:', e);
        throw e;
    }

    return auth;
}

export async function getSheetData(spreadsheetId: string, range: string) {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });
        return response.data.values || [];
    } catch (error) {
        console.error('Error fetching sheet data:', error);
        throw error;
    }
}

export async function updateSheetRow(spreadsheetId: string, range: string, values: any[]) {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    try {
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [values],
            },
        });
    } catch (error) {
        console.error('Error updating sheet row:', error);
        throw error;
    }
}
