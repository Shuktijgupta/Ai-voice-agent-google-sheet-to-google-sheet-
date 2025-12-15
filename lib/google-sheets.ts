import { google, sheets_v4 } from 'googleapis';
import { JWT } from 'googleapis-common';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Cache auth client to avoid repeated authentication
let cachedAuth: JWT | null = null;
let authExpiryTime: number = 0;

/**
 * Process the private key for proper formatting
 * Handles various formats from .env files
 */
function processPrivateKey(rawKey: string): string {
    let key = rawKey;
    
    // Replace literal \n with actual newlines
    key = key.replace(/\\n/g, '\n');
    
    // Remove surrounding quotes if present
    if ((key.startsWith('"') && key.endsWith('"')) || 
        (key.startsWith("'") && key.endsWith("'"))) {
        key = key.slice(1, -1);
    }
    
    // Ensure proper PEM format with correct line breaks
    if (!key.includes('\n')) {
        // Key might be base64 encoded without line breaks - add them
        const header = '-----BEGIN PRIVATE KEY-----';
        const footer = '-----END PRIVATE KEY-----';
        
        if (key.includes(header)) {
            // Extract the base64 content and reformat
            let base64 = key
                .replace(header, '')
                .replace(footer, '')
                .replace(/\s/g, '');
            
            // Split into 64-char lines
            const lines = [];
            for (let i = 0; i < base64.length; i += 64) {
                lines.push(base64.slice(i, i + 64));
            }
            
            key = `${header}\n${lines.join('\n')}\n${footer}\n`;
        }
    }
    
    return key;
}

// Get or create cached auth client
async function getAuthClient(): Promise<JWT> {
    const now = Date.now();
    
    // Return cached auth if still valid (with 5-minute buffer)
    if (cachedAuth && authExpiryTime > now + 300000) {
        return cachedAuth;
    }

    const email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    const rawKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
    
    // #region agent log
    console.log('[DEBUG] Google Sheets Auth - Checking credentials:', {
        hasEmail: !!email,
        hasKey: !!rawKey,
        keyLength: rawKey?.length || 0,
        keyStart: rawKey?.substring(0, 40) || 'none',
    });
    // #endregion

    if (!email || !rawKey) {
        throw new Error('Missing Google Sheets credentials. Please check GOOGLE_SHEETS_CLIENT_EMAIL and GOOGLE_SHEETS_PRIVATE_KEY in .env');
    }

    // Process the private key
    const key = processPrivateKey(rawKey);
    
    // #region agent log
    console.log('[DEBUG] Google Sheets Auth - After processing key:', {
        keyLength: key.length,
        hasNewlines: key.includes('\n'),
        lineCount: key.split('\n').length,
        startsWithHeader: key.startsWith('-----BEGIN'),
    });
    // #endregion

    const auth = new google.auth.JWT({
        email,
        key,
        scopes: SCOPES,
    });

    try {
        // #region agent log
        console.log('[DEBUG] Google Sheets Auth - Attempting authorization...');
        // #endregion
        const token = await auth.authorize();
        // Cache for token expiry time (usually 1 hour)
        authExpiryTime = token.expiry_date || now + 3600000;
        cachedAuth = auth;
        // #region agent log
        console.log('[DEBUG] Google Sheets Auth - SUCCESS! Token expires:', new Date(authExpiryTime).toISOString());
        // #endregion
        return auth;
    } catch (e: any) {
        // #region agent log
        console.error('[DEBUG] Google Sheets Auth - FAILED:', {
            message: e?.message,
            code: e?.code,
            opensslError: e?.opensslErrorStack,
        });
        // #endregion
        cachedAuth = null;
        
        // Provide helpful error message
        if (e?.code === 'ERR_OSSL_UNSUPPORTED') {
            throw new Error(
                'OpenSSL 3.0 compatibility error with private key. ' +
                'Please ensure your GOOGLE_SHEETS_PRIVATE_KEY is correctly formatted in .env file. ' +
                'The key should start with -----BEGIN PRIVATE KEY----- and use \\n for line breaks.'
            );
        }
        throw e;
    }
}

// Cache sheets client
let sheetsClient: sheets_v4.Sheets | null = null;

async function getSheetsClient(): Promise<sheets_v4.Sheets> {
    const auth = await getAuthClient();
    
    if (!sheetsClient) {
        sheetsClient = google.sheets({ version: 'v4', auth });
    }
    
    return sheetsClient;
}

export async function getSheetData(spreadsheetId: string, range: string): Promise<string[][]> {
    const sheets = await getSheetsClient();

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });
        return response.data.values || [];
    } catch (error) {
        console.error('Error fetching sheet data:', error);
        // Reset cache on error
        sheetsClient = null;
        cachedAuth = null;
        throw error;
    }
}

export async function updateSheetRow(
    spreadsheetId: string, 
    range: string, 
    values: (string | number | boolean)[]
): Promise<void> {
    const sheets = await getSheetsClient();

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
        // Reset cache on error
        sheetsClient = null;
        cachedAuth = null;
        throw error;
    }
}

// Batch update for better performance
export async function batchUpdateSheetRows(
    spreadsheetId: string,
    updates: { range: string; values: (string | number | boolean)[] }[]
): Promise<void> {
    if (updates.length === 0) return;
    
    const sheets = await getSheetsClient();

    try {
        await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId,
            requestBody: {
                valueInputOption: 'USER_ENTERED',
                data: updates.map(u => ({
                    range: u.range,
                    values: [u.values],
                })),
            },
        });
    } catch (error) {
        console.error('Error batch updating sheet:', error);
        sheetsClient = null;
        cachedAuth = null;
        throw error;
    }
}
