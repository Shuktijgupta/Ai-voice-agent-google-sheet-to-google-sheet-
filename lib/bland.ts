const BLAND_API_URL = 'https://api.bland.ai/v1/calls';

// Type definitions
interface BlandCallOptions {
    phoneNumber: string;
    task: string;
    model?: 'enhanced' | 'turbo';
    language?: string;
    voice?: string;
    countryCode?: string;
}

interface BlandCallResponse {
    call_id: string;
    status: string;
    batch_id?: string;
}

interface BlandCallDetails {
    call_id: string;
    status: string;
    duration_seconds?: number;
    summary?: string;
    transcript?: string;
    transcripts?: Array<{ user: string; text: string }>;
    recording_url?: string;
    price?: number;
    analysis?: {
        summary?: string;
        transcript?: string;
        user_answers?: Record<string, string>;
    };
}

// Validate and format phone number
function formatPhoneNumber(phone: string, defaultCountryCode: string = '+91'): string {
    // Remove all non-numeric characters except +
    let formatted = phone.replace(/[^\d+]/g, '');
    
    // If no country code, add default
    if (!formatted.startsWith('+')) {
        // Remove leading zeros
        formatted = formatted.replace(/^0+/, '');
        formatted = `${defaultCountryCode}${formatted}`;
    }
    
    return formatted;
}

// Start a call via Bland AI
export async function sendBlandCall(options: BlandCallOptions): Promise<BlandCallResponse> {
    const apiKey = process.env.BLAND_API_KEY;
    if (!apiKey) {
        throw new Error('BLAND_API_KEY is not configured');
    }

    const {
        phoneNumber,
        task,
        model = 'enhanced',
        language = 'en',
        voice = 'nat',
        countryCode = '+91'
    } = options;

    const formattedPhone = formatPhoneNumber(phoneNumber, countryCode);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const webhookUrl = baseUrl ? `${baseUrl}/api/bland/webhook` : '';

    const body: Record<string, unknown> = {
        phone_number: formattedPhone,
        task,
        model,
        language,
        voice,
        record: true,
        transcribe: true,
        summary: true,
        analysis_schema: {
            summary: "Summarize the call in 2-3 sentences.",
            transcript: "Full transcript of the call.",
            user_answers: "Extract the user's answers to the questions asked."
        },
        metadata: {},
    };

    // Only add webhook for HTTPS URLs (Bland AI requirement)
    if (webhookUrl.startsWith('https://')) {
        body.webhook = webhookUrl;
    }

    const response = await fetch(BLAND_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': apiKey,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(error.message || `Bland API error: ${response.status}`);
    }

    return response.json();
}

// Get call details from Bland AI
export async function getCallDetails(callId: string): Promise<BlandCallDetails> {
    const apiKey = process.env.BLAND_API_KEY;
    if (!apiKey) {
        throw new Error('BLAND_API_KEY is not configured');
    }

    const response = await fetch(`${BLAND_API_URL}/${callId}`, {
        method: 'GET',
        headers: {
            'Authorization': apiKey,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch call details: ${response.status}`);
    }

    return response.json();
}

// Legacy function signature for backward compatibility
export async function sendBlandCallLegacy(
    phoneNumber: string, 
    task: string, 
    model: string = 'enhanced', 
    language: string = 'en'
): Promise<BlandCallResponse> {
    return sendBlandCall({ phoneNumber, task, model: model as 'enhanced' | 'turbo', language });
}
