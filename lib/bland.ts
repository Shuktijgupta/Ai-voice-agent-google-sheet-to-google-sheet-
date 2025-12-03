const BLAND_API_URL = 'https://api.bland.ai/v1/calls';

export async function sendBlandCall(phoneNumber: string, task: string, model: string = 'enhanced', language: string = 'en') {
    const apiKey = process.env.BLAND_API_KEY;
    if (!apiKey) {
        throw new Error('BLAND_API_KEY is not set');
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const webhookUrl = `${baseUrl}/api/bland/webhook`;

    // Format phone number: Default to +91 (India) if no country code provided
    let formattedPhone = phoneNumber.replace(/[^\d+]/g, ''); // Remove non-numeric chars except +
    if (!formattedPhone.startsWith('+')) {
        // If it's a 10-digit number (common in India), assume +91
        if (formattedPhone.length === 10) {
            formattedPhone = `+91${formattedPhone}`;
        } else {
            // Fallback: just prepend +91 if it doesn't have a + prefix, 
            // though user might have entered a partial number.
            formattedPhone = `+91${formattedPhone}`;
        }
    }

    // Construct the body object
    const body: any = {
        phone_number: formattedPhone,
        task: task,
        model: model,
        language: language,
        voice: 'nat',
        record: true,
        transcribe: true,
        summary: true,
        analysis_schema: {
            "summary": "Summarize the call in 2-3 sentences.",
            "transcript": "Full transcript of the call.",
            "user_answers": "Extract the user's answers to the questions asked."
        },
        metadata: {}
    };

    // Bland AI requires HTTPS for webhooks. Localhost (http) will fail validation.
    // We only include the webhook if it's a valid HTTPS URL.
    if (webhookUrl.startsWith('https')) {
        body.webhook = webhookUrl;
    } else {
        console.warn('WARNING: Webhook URL is not HTTPS (likely localhost). Skipping webhook parameter. Call status will not update automatically.');
    }

    const response = await fetch(BLAND_API_URL, {
        method: 'POST',
        headers: {
            'authorization': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start Bland AI call');
    }

    return await response.json();
}

export async function getCallDetails(callId: string) {
    const apiKey = process.env.BLAND_API_KEY;
    if (!apiKey) throw new Error('BLAND_API_KEY is not set');

    const response = await fetch(`${BLAND_API_URL}/${callId}`, {
        method: 'GET',
        headers: {
            'authorization': apiKey
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch call details from Bland AI');
    }

    return await response.json();
}
