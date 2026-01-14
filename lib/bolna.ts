/**
 * Bolna - Open Source Voice AI Agent Framework
 * GitHub: https://github.com/bolna-ai/bolna
 * 
 * Supports:
 * - Local LLMs via Ollama (Llama, Mistral, DeepSeek)
 * - Cloud LLMs (OpenAI, Groq, Together, etc.)
 * - Multiple ASR providers (Deepgram, Whisper)
 * - Multiple TTS providers (ElevenLabs, OpenAI, Polly, XTTS for local)
 * - Telephony (Indian providers: Plivo, Exotel, Knowlarity, Ozonetel)
 */

// Type definitions
export interface BolnaConfig {
    serverUrl: string;
    apiKey?: string;
    // LLM Configuration
    llmProvider: 'openai' | 'ollama' | 'groq' | 'together' | 'deepseek' | 'anthropic';
    llmModel: string;
    // ASR Configuration
    asrProvider: 'deepgram' | 'whisper';
    asrModel?: string;
    // TTS Configuration
    ttsProvider: 'elevenlabs' | 'openai' | 'polly' | 'xtts' | 'deepgram';
    ttsVoice?: string;
    // Telephony (Indian providers)
    telephonyProvider?: 'plivo' | 'exotel' | 'knowlarity' | 'ozonetel';
}

export interface BolnaCallOptions {
    phoneNumber: string;
    agentConfig: BolnaAgentConfig;
    metadata?: Record<string, string>;
}

export interface BolnaAgentConfig {
    agentName: string;
    systemPrompt: string;
    firstMessage?: string;
    language?: string;
    // Task configuration
    task: {
        type: 'conversation';
        toolsConfig?: {
            llmAgent: {
                provider: string;
                model: string;
                temperature?: number;
            };
        };
    };
    // Provider overrides for this specific call
    asrProvider?: string;
    ttsProvider?: string;
    ttsVoice?: string;
}

export interface BolnaCallResponse {
    callId: string;
    status: string;
    agentId?: string;
}

export interface BolnaCallDetails {
    callId: string;
    status: 'in-progress' | 'completed' | 'failed' | 'queued';
    duration?: number;
    transcript?: string;
    recordingUrl?: string;
    summary?: string;
}

/**
 * Check if Bolna is configured
 */
export function isBolnaConfigured(): boolean {
    return !!process.env.BOLNA_SERVER_URL;
}

/**
 * Get Bolna configuration from environment
 */
export function getBolnaConfig(): BolnaConfig | null {
    const serverUrl = process.env.BOLNA_SERVER_URL;
    
    if (!serverUrl) {
        return null;
    }
    
    return {
        serverUrl,
        apiKey: process.env.BOLNA_API_KEY,
        // LLM - defaults to local Ollama with Llama
        llmProvider: (process.env.BOLNA_LLM_PROVIDER as BolnaConfig['llmProvider']) || 'ollama',
        llmModel: process.env.BOLNA_LLM_MODEL || 'llama3.2',
        // ASR - defaults to Deepgram
        asrProvider: (process.env.BOLNA_ASR_PROVIDER as BolnaConfig['asrProvider']) || 'deepgram',
        asrModel: process.env.BOLNA_ASR_MODEL,
        // TTS - defaults to local XTTS
        ttsProvider: (process.env.BOLNA_TTS_PROVIDER as BolnaConfig['ttsProvider']) || 'xtts',
        ttsVoice: process.env.BOLNA_TTS_VOICE,
        // Telephony
        telephonyProvider: process.env.BOLNA_TELEPHONY_PROVIDER as 'plivo' | 'exotel' | 'knowlarity' | 'ozonetel' | undefined,
    };
}

/**
 * Format phone number for Bolna
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
 * Create a Bolna agent configuration
 */
export function createBolnaAgentConfig(options: {
    name: string;
    systemPrompt: string;
    firstMessage?: string;
    language?: string;
    config?: BolnaConfig;
}): BolnaAgentConfig {
    const config = options.config || getBolnaConfig();
    
    return {
        agentName: options.name,
        systemPrompt: options.systemPrompt,
        firstMessage: options.firstMessage,
        language: options.language || 'hi', // Default to Hindi for your use case
        task: {
            type: 'conversation',
            toolsConfig: {
                llmAgent: {
                    provider: config?.llmProvider || 'ollama',
                    model: config?.llmModel || 'llama3.2',
                    temperature: 0.7,
                },
            },
        },
        asrProvider: config?.asrProvider,
        ttsProvider: config?.ttsProvider,
        ttsVoice: config?.ttsVoice,
    };
}

/**
 * Start a call via Bolna
 */
export async function sendBolnaCall(options: BolnaCallOptions): Promise<BolnaCallResponse> {
    const config = getBolnaConfig();
    if (!config) {
        throw new Error('Bolna is not configured. Please set BOLNA_SERVER_URL in .env');
    }

    const { phoneNumber, agentConfig, metadata = {} } = options;
    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Construct the Bolna agent payload
    const agentPayload = {
        agent_config: {
            agent_name: agentConfig.agentName,
            agent_type: 'other',
            agent_welcome_message: agentConfig.firstMessage || `Hello, this is ${agentConfig.agentName}. How can I help you today?`,
        },
        tasks: [
            {
                task_type: agentConfig.task.type,
                toolchain: {
                    execution: 'parallel',
                    pipelines: [
                        [
                            'transcriber',
                            'llm',
                            'synthesizer',
                        ],
                    ],
                },
                tools_config: {
                    llm_agent: {
                        agent_flow_type: 'streaming',
                        provider: agentConfig.task.toolsConfig?.llmAgent.provider || 'ollama',
                        request_json: true,
                        model: agentConfig.task.toolsConfig?.llmAgent.model || 'llama3.2',
                        temperature: agentConfig.task.toolsConfig?.llmAgent.temperature || 0.7,
                    },
                    transcriber: {
                        provider: agentConfig.asrProvider || 'deepgram',
                        model: 'nova-2',
                        stream: true,
                        language: agentConfig.language || 'hi',
                    },
                    synthesizer: {
                        provider: agentConfig.ttsProvider || 'xtts',
                        ...(agentConfig.ttsVoice && { voice: agentConfig.ttsVoice }),
                        stream: true,
                        audio_format: 'wav',
                    },
                    input: {
                        provider: config.telephonyProvider || 'plivo',
                        format: 'wav',
                    },
                    output: {
                        provider: config.telephonyProvider || 'plivo',
                        format: 'wav',
                    },
                },
                task_config: {
                    hangup_after_silence: 10,
                    incremental_delay: 300,
                    ambient_noise: false,
                },
            },
        ],
    };

    // Make the API call to Bolna server
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    
    if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    // First, create the agent
    const createAgentResponse = await fetch(`${config.serverUrl}/agent`, {
        method: 'POST',
        headers,
        body: JSON.stringify(agentPayload),
    });

    if (!createAgentResponse.ok) {
        const error = await createAgentResponse.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `Bolna API error: ${createAgentResponse.status}`);
    }

    const agentData = await createAgentResponse.json();
    const agentId = agentData.agent_id;

    // Then, initiate the call
    const callPayload = {
        agent_id: agentId,
        recipient_phone_number: formattedPhone,
        user_data: {
            system_prompt: agentConfig.systemPrompt,
            ...metadata,
        },
    };

    const callResponse = await fetch(`${config.serverUrl}/call`, {
        method: 'POST',
        headers,
        body: JSON.stringify(callPayload),
    });

    if (!callResponse.ok) {
        const error = await callResponse.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `Bolna call error: ${callResponse.status}`);
    }

    const callData = await callResponse.json();

    return {
        callId: callData.call_id || callData.id,
        status: callData.status || 'initiated',
        agentId,
    };
}

/**
 * Get call details from Bolna
 */
export async function getBolnaCallDetails(callId: string): Promise<BolnaCallDetails> {
    const config = getBolnaConfig();
    if (!config) {
        throw new Error('Bolna is not configured');
    }

    const headers: Record<string, string> = {};
    if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(`${config.serverUrl}/call/${callId}`, {
        method: 'GET',
        headers,
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch call details: ${response.status}`);
    }

    const data = await response.json();

    return {
        callId: data.call_id || callId,
        status: data.status,
        duration: data.duration_seconds,
        transcript: data.transcript,
        recordingUrl: data.recording_url,
        summary: data.summary,
    };
}

/**
 * Parse webhook payload from Bolna
 */
export function parseBolnaWebhook(payload: any): {
    callId: string;
    status: string;
    duration?: number;
    transcript?: string;
    recordingUrl?: string;
    summary?: string;
} {
    return {
        callId: payload.call_id || payload.id,
        status: payload.status || 'unknown',
        duration: payload.duration_seconds || payload.call_duration,
        transcript: payload.transcript,
        recordingUrl: payload.recording_url,
        summary: payload.summary,
    };
}

/**
 * Get supported LLM providers for Bolna
 */
export function getBolnaSupportedLLMs(): Array<{ id: string; name: string; local: boolean }> {
    return [
        { id: 'ollama', name: 'Ollama (Local)', local: true },
        { id: 'openai', name: 'OpenAI', local: false },
        { id: 'groq', name: 'Groq', local: false },
        { id: 'together', name: 'Together AI', local: false },
        { id: 'deepseek', name: 'DeepSeek', local: false },
        { id: 'anthropic', name: 'Anthropic Claude', local: false },
    ];
}

/**
 * Get supported TTS providers for Bolna
 */
export function getBolnaSupportedTTS(): Array<{ id: string; name: string; local: boolean }> {
    return [
        { id: 'xtts', name: 'XTTS (Local)', local: true },
        { id: 'elevenlabs', name: 'ElevenLabs', local: false },
        { id: 'openai', name: 'OpenAI TTS', local: false },
        { id: 'polly', name: 'AWS Polly', local: false },
        { id: 'deepgram', name: 'Deepgram', local: false },
    ];
}
