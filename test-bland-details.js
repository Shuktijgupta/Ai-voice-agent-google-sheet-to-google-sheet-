const fs = require('fs');
const path = require('path');

// Manually read .env
try {
    const envPath = path.resolve(__dirname, '.env');
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            let val = value.trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            process.env[key.trim()] = val;
        }
    });
} catch (e) {
    console.warn('Could not read .env file');
}

const API_KEY = process.env.BLAND_API_KEY;
const BLAND_API_URL = 'https://api.bland.ai/v1/calls';

if (!API_KEY) {
    console.error('BLAND_API_KEY is not set in .env');
    process.exit(1);
}

console.log(`Loaded API Key: ${API_KEY.substring(0, 4)}... (Length: ${API_KEY.length})`);

// Replace with a recent call ID from your logs or database
const CALL_ID = process.argv[2];

if (!CALL_ID) {
    console.error('Please provide a Call ID as an argument.');
    console.log('Usage: node test-bland-details.js <CALL_ID>');
    process.exit(1);
}

async function getCallDetails(callId) {
    console.log(`Fetching details for call ID: ${callId}...`);
    try {
        const response = await fetch(`${BLAND_API_URL}/${callId}`, {
            method: 'GET',
            headers: {
                'authorization': API_KEY
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch call details: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log('--- Call Details Response ---');
        console.log(JSON.stringify(data, null, 2));
        console.log('-----------------------------');

        // Check for specific fields
        console.log('Status:', data.status);
        console.log('Recording URL:', data.recording_url);
        console.log('Transcripts:', data.transcripts ? 'Present' : 'Missing');
        console.log('Analysis:', data.analysis ? 'Present' : 'Missing');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

getCallDetails(CALL_ID);
