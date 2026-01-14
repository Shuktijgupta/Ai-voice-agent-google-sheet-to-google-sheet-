/**
 * Telephony Provider Interface
 * Supports multiple telephony providers including Indian providers
 */

export interface TelephonyConfig {
    provider: 'exotel' | 'knowlarity' | 'ozonetel' | 'plivo' | 'tata' | 'custom';
    // Common fields
    apiKey?: string;
    apiSecret?: string;
    accountSid?: string;
    authToken?: string;
    phoneNumber?: string;
    // Provider-specific
    [key: string]: any;
}

export interface CallInitiateOptions {
    to: string;
    from: string;
    webhookUrl: string;
    driverId: string;
    agentId: string | null;
    systemPrompt: string;
}

export interface CallResponse {
    success: boolean;
    callId: string;
    error?: string;
}

/**
 * Get telephony configuration from environment
 */
export function getTelephonyConfig(): TelephonyConfig | null {
    // Check for different providers
    if (process.env.EXOTEL_API_KEY && process.env.EXOTEL_API_TOKEN) {
        return {
            provider: 'exotel',
            apiKey: process.env.EXOTEL_API_KEY,
            apiSecret: process.env.EXOTEL_API_TOKEN,
            phoneNumber: process.env.EXOTEL_PHONE_NUMBER,
            subdomain: process.env.EXOTEL_SUBDOMAIN || 'api',
        };
    }

    if (process.env.KNOWLARITY_API_KEY && process.env.KNOWLARITY_API_TOKEN) {
        return {
            provider: 'knowlarity',
            apiKey: process.env.KNOWLARITY_API_KEY,
            apiSecret: process.env.KNOWLARITY_API_TOKEN,
            phoneNumber: process.env.KNOWLARITY_PHONE_NUMBER,
        };
    }

    if (process.env.OZONETEL_API_KEY && process.env.OZONETEL_API_TOKEN) {
        return {
            provider: 'ozonetel',
            apiKey: process.env.OZONETEL_API_KEY,
            apiSecret: process.env.OZONETEL_API_TOKEN,
            phoneNumber: process.env.OZONETEL_PHONE_NUMBER,
        };
    }

    if (process.env.PLIVO_AUTH_ID && process.env.PLIVO_AUTH_TOKEN) {
        return {
            provider: 'plivo',
            accountSid: process.env.PLIVO_AUTH_ID,
            authToken: process.env.PLIVO_AUTH_TOKEN,
            phoneNumber: process.env.PLIVO_PHONE_NUMBER,
        };
    }

    if (process.env.TATA_API_KEY && process.env.TATA_API_TOKEN) {
        return {
            provider: 'tata',
            apiKey: process.env.TATA_API_KEY,
            apiSecret: process.env.TATA_API_TOKEN,
            phoneNumber: process.env.TATA_PHONE_NUMBER,
            agentNumber: process.env.TATA_AGENT_NUMBER, // Required for Tata Click-to-Call
        };
    }

    // Custom provider (user can implement)
    if (process.env.TELEPHONY_PROVIDER === 'custom') {
        return {
            provider: 'custom',
            apiKey: process.env.TELEPHONY_API_KEY,
            apiSecret: process.env.TELEPHONY_API_SECRET,
            phoneNumber: process.env.TELEPHONY_PHONE_NUMBER,
            apiUrl: process.env.TELEPHONY_API_URL,
        };
    }

    return null;
}

/**
 * Check if telephony is configured
 */
export function isTelephonyConfigured(): boolean {
    return getTelephonyConfig() !== null;
}

/**
 * Format phone number for Indian providers
 */
export function formatIndianPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Remove leading 0
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }
    
    // Add +91 if not present
    if (!cleaned.startsWith('91')) {
        cleaned = '91' + cleaned;
    }
    
    // Ensure it's 12 digits (91 + 10 digits)
    if (cleaned.length === 12) {
        return '+' + cleaned;
    }
    
    // If already has +, return as is
    if (phone.startsWith('+')) {
        return phone;
    }
    
    return '+' + cleaned;
}

/**
 * Initiate call via Exotel (Popular Indian provider)
 */
async function initiateExotelCall(options: CallInitiateOptions, config: TelephonyConfig): Promise<CallResponse> {
    const apiKey = config.apiKey!;
    const apiSecret = config.apiSecret!;
    const subdomain = config.subdomain || 'api';
    
    const url = `https://${subdomain}.exotel.com/v1/Accounts/${apiKey}/Calls/connect.json`;
    
    const to = formatIndianPhoneNumber(options.to);
    const from = formatIndianPhoneNumber(options.from || config.phoneNumber!);
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            From: from,
            To: to,
            CallerId: from,
            Url: options.webhookUrl,
            TimeLimit: 300, // 5 minutes max
            StatusCallback: `${options.webhookUrl}/status`,
            Record: true,
            RecordCallback: `${options.webhookUrl}/recording`,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Exotel API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
        success: true,
        callId: data.Call?.Sid || data.Sid || data.call_id,
    };
}

/**
 * Initiate call via Knowlarity (Indian provider)
 */
async function initiateKnowlarityCall(options: CallInitiateOptions, config: TelephonyConfig): Promise<CallResponse> {
    const apiKey = config.apiKey!;
    const apiSecret = config.apiSecret!;
    
    const url = 'https://www.knowlarity.com/api/v1/call';
    
    const to = formatIndianPhoneNumber(options.to);
    const from = formatIndianPhoneNumber(options.from || config.phoneNumber!);
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: from,
            to: to,
            webhook_url: options.webhookUrl,
            record: true,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Knowlarity API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
        success: true,
        callId: data.call_id || data.id,
    };
}

/**
 * Initiate call via Ozonetel (Indian provider)
 */
async function initiateOzonetelCall(options: CallInitiateOptions, config: TelephonyConfig): Promise<CallResponse> {
    const apiKey = config.apiKey!;
    const apiSecret = config.apiSecret!;
    
    const url = 'https://ozonetel.com/api/v1/call';
    
    const to = formatIndianPhoneNumber(options.to);
    const from = formatIndianPhoneNumber(options.from || config.phoneNumber!);
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiSecret}`,
            'Content-Type': 'application/json',
            'X-API-KEY': apiKey,
        },
        body: JSON.stringify({
            from: from,
            to: to,
            webhook_url: options.webhookUrl,
            record: true,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ozonetel API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
        success: true,
        callId: data.call_id || data.id,
    };
}

/**
 * Initiate call via Plivo (Supports India)
 */
async function initiatePlivoCall(options: CallInitiateOptions, config: TelephonyConfig): Promise<CallResponse> {
    const accountSid = config.accountSid!;
    const authToken = config.authToken!;
    
    const url = `https://api.plivo.com/v1/Account/${accountSid}/Call/`;
    
    const to = formatIndianPhoneNumber(options.to);
    const from = formatIndianPhoneNumber(options.from || config.phoneNumber!);
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            to: to,
            from: from,
            answer_url: options.webhookUrl,
            answer_method: 'POST',
            record: true,
            record_callback: `${options.webhookUrl}/recording`,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Plivo API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
        success: true,
        callId: data.call_uuid || data.request_uuid,
    };
}

/**
 * Initiate call via Tata Telebusiness SmartFlo (Click-to-Call)
 * Documentation: https://docs.smartflo.tatatelebusiness.com/reference/v1click_to_call
 */
async function initiateTataCall(options: CallInitiateOptions, config: TelephonyConfig): Promise<CallResponse> {
    const apiKey = config.apiKey!;
    const apiSecret = config.apiSecret!;
    const agentNumber = config.agentNumber || process.env.TATA_AGENT_NUMBER;
    
    if (!agentNumber) {
        throw new Error('TATA_AGENT_NUMBER is required for Tata Click-to-Call. Please set it in your .env file.');
    }
    
    const url = 'https://api-smartflo.tatateleservices.com/v1/click_to_call';
    
    // Format phone numbers (Tata expects Indian format)
    const destinationNumber = formatIndianPhoneNumber(options.to);
    const callerId = formatIndianPhoneNumber(options.from || config.phoneNumber || agentNumber);
    
    // Prepare request body according to Tata API spec
    const requestBody: any = {
        agent_number: agentNumber, // Required: SmartFlo agent who will receive the call
        destination_number: destinationNumber, // Required: Client number to call
        async: 1, // Required: 1 for asynchronous (don't wait for agent pickup)
    };
    
    // Optional: Caller ID
    if (callerId) {
        requestBody.caller_id = callerId;
    }
    
    // Optional: Call timeout (in seconds)
    if (process.env.TATA_CALL_TIMEOUT) {
        requestBody.call_timeout = parseInt(process.env.TATA_CALL_TIMEOUT);
    }
    
    // Optional: Custom identifier (will be returned in webhook)
    requestBody.custom_identifier = JSON.stringify({
        driverId: options.driverId,
        agentId: options.agentId,
        webhookUrl: options.webhookUrl,
    });
    
    // Tata SmartFlo uses Bearer token authentication
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiSecret}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            // Some Tata APIs also use API key in header
            ...(apiKey && { 'X-API-KEY': apiKey }),
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Tata SmartFlo API error: ${response.status}`;
        
        try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.Message || errorData.message || errorMessage;
        } catch {
            errorMessage += ` - ${errorText}`;
        }
        
        throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Tata API returns { Success: boolean, Message: string }
    if (!data.Success && data.Success !== undefined) {
        throw new Error(data.Message || 'Tata SmartFlo call initiation failed');
    }
    
    // For async calls, we need to track via webhook
    // The call ID might be in the response or we'll get it from webhook
    // Using a combination of agent_number and destination_number as temporary ID
    const callId = data.call_id || data.id || `${agentNumber}_${destinationNumber}_${Date.now()}`;
    
    return {
        success: true,
        callId: callId,
    };
}

/**
 * Initiate call via custom provider
 */
async function initiateCustomCall(options: CallInitiateOptions, config: TelephonyConfig): Promise<CallResponse> {
    const apiUrl = config.apiUrl || process.env.TELEPHONY_API_URL;
    
    if (!apiUrl) {
        throw new Error('Custom telephony provider requires TELEPHONY_API_URL');
    }
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.apiSecret || ''}`,
            'Content-Type': 'application/json',
            ...(config.apiKey && { 'X-API-KEY': config.apiKey }),
        },
        body: JSON.stringify({
            to: formatIndianPhoneNumber(options.to),
            from: formatIndianPhoneNumber(options.from || config.phoneNumber!),
            webhook_url: options.webhookUrl,
            record: true,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Custom telephony API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
        success: true,
        callId: data.call_id || data.id || data.callSid,
    };
}

/**
 * Initiate a call using the configured telephony provider
 * Includes retry logic and error handling
 */
export async function initiateCall(options: CallInitiateOptions): Promise<CallResponse> {
    const { retryWithBackoff } = await import('./error-handler');
    const config = getTelephonyConfig();
    
    if (!config) {
        throw new Error('No telephony provider configured. Please set up Exotel, Knowlarity, Ozonetel, Plivo, or Tata credentials.');
    }

    const initiate = async () => {
        switch (config.provider) {
            case 'exotel':
                return await initiateExotelCall(options, config);
            case 'knowlarity':
                return await initiateKnowlarityCall(options, config);
            case 'ozonetel':
                return await initiateOzonetelCall(options, config);
            case 'plivo':
                return await initiatePlivoCall(options, config);
            case 'tata':
                return await initiateTataCall(options, config);
            case 'custom':
                return await initiateCustomCall(options, config);
            default:
                throw new Error(`Unsupported telephony provider: ${config.provider}`);
        }
    };

    // Retry with exponential backoff
    try {
        return await retryWithBackoff(
            initiate,
            { maxRetries: 3, initialDelay: 1000 },
            (attempt, error) => {
                console.log(`Telephony call retry attempt ${attempt}:`, error.message);
            }
        );
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        throw new Error(`Failed to initiate call after retries: ${err.message}`);
    }
}

