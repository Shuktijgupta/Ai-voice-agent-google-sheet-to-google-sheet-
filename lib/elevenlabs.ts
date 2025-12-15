/**
 * ElevenLabs Conversational AI Service
 * Documentation: https://elevenlabs.io/docs/conversational-ai/guides/conversational-ai-guide
 */

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Type definitions
export interface ElevenLabsCallOptions {
    phoneNumber: string;
    agentId: string; // ElevenLabs Agent ID
    firstMessage?: string;
    systemPrompt?: string;
    language?: string;
    metadata?: Record<string, string>;
}

export interface ElevenLabsCallResponse {
    conversation_id: string;
    status: string;
    agent_id: string;
}

export interface ElevenLabsCallDetails {
    conversation_id: string;
    status: 'in-progress' | 'completed' | 'failed';
    duration_seconds?: number;
    transcript?: string;
    recording_url?: string;
    summary?: string;
    metadata?: Record<string, string>;
}

export interface ElevenLabsConfig {
    apiKey: string;
    agentId: string;
    webhookUrl?: string;
}

/**
 * Check if ElevenLabs is configured
 */
export function isElevenLabsConfigured(): boolean {
    return !!(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID);
}

/**
 * Get ElevenLabs configuration
 */
export function getElevenLabsConfig(): ElevenLabsConfig | null {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const agentId = process.env.ELEVENLABS_AGENT_ID;
    
    if (!apiKey || !agentId) {
        return null;
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const webhookUrl = baseUrl ? `${baseUrl}/api/elevenlabs/webhook` : undefined;
    
    return { apiKey, agentId, webhookUrl };
}

/**
 * Format phone number for ElevenLabs
 */
function formatPhoneNumber(phone: string, defaultCountryCode: string = '+91'): string {
    let formatted = phone.replace(/[^\d+]/g, '');
    
    if (!formatted.startsWith('+')) {
        formatted = formatted.replace(/^0+/, '');
        formatted = `${defaultCountryCode}${formatted}`;
    }
    
    return formatted;
}

/**
 * Start a call via ElevenLabs Conversational AI
 * Note: ElevenLabs uses WebSocket-based conversations, but also supports outbound calls
 */
export async function sendElevenLabsCall(options: ElevenLabsCallOptions): Promise<ElevenLabsCallResponse> {
    const config = getElevenLabsConfig();
    if (!config) {
        throw new Error('ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID are not configured');
    }

    const {
        phoneNumber,
        agentId = config.agentId,
        firstMessage,
        systemPrompt,
        language = 'en',
        metadata = {}
    } = options;

    const formattedPhone = formatPhoneNumber(phoneNumber);

    // ElevenLabs Conversational AI - Outbound Call endpoint
    const response = await fetch(`${ELEVENLABS_API_URL}/convai/conversation/phone-call`, {
        method: 'POST',
        headers: {
            'xi-api-key': config.apiKey,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            agent_id: agentId,
            phone_number: formattedPhone,
            first_message: firstMessage,
            dynamic_variables: {
                language,
                ...metadata,
            },
            // Optional: Override agent configuration for this call
            ...(systemPrompt && {
                agent_config_override: {
                    prompt: {
                        prompt: systemPrompt,
                    },
                },
            }),
            // Webhook for call events
            ...(config.webhookUrl && {
                webhook_url: config.webhookUrl,
            }),
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `ElevenLabs API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
        conversation_id: data.conversation_id,
        status: data.status || 'initiated',
        agent_id: agentId,
    };
}

/**
 * Get conversation/call details from ElevenLabs
 */
export async function getElevenLabsCallDetails(conversationId: string): Promise<ElevenLabsCallDetails> {
    const config = getElevenLabsConfig();
    if (!config) {
        throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    const response = await fetch(`${ELEVENLABS_API_URL}/convai/conversation/${conversationId}`, {
        method: 'GET',
        headers: {
            'xi-api-key': config.apiKey,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch call details: ${response.status}`);
    }

    const data = await response.json();
    
    return {
        conversation_id: data.conversation_id,
        status: data.status,
        duration_seconds: data.call_duration_secs,
        transcript: data.transcript,
        recording_url: data.recording_url,
        summary: data.analysis?.summary,
        metadata: data.metadata,
    };
}

/**
 * Get available ElevenLabs agents
 */
export async function getElevenLabsAgents(): Promise<Array<{ agent_id: string; name: string }>> {
    const config = getElevenLabsConfig();
    if (!config) {
        throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    const response = await fetch(`${ELEVENLABS_API_URL}/convai/agents`, {
        method: 'GET',
        headers: {
            'xi-api-key': config.apiKey,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch agents: ${response.status}`);
    }

    const data = await response.json();
    return data.agents || [];
}

/**
 * Parse webhook payload from ElevenLabs
 */
export function parseElevenLabsWebhook(payload: any): {
    conversationId: string;
    status: string;
    duration?: number;
    transcript?: string;
    recordingUrl?: string;
    summary?: string;
} {
    return {
        conversationId: payload.conversation_id,
        status: payload.status || 'unknown',
        duration: payload.call_duration_secs,
        transcript: payload.transcript,
        recordingUrl: payload.recording_url,
        summary: payload.analysis?.summary,
    };
}

