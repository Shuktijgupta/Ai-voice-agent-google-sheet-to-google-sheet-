import { NextResponse } from 'next/server';
import { 
    isBolnaConfigured, 
    getBolnaConfig, 
    getBolnaSupportedLLMs, 
    getBolnaSupportedTTS 
} from '@/lib/bolna';

/**
 * Check if Ollama is running locally
 */
async function checkOllama(): Promise<{ running: boolean; models: string[] }> {
    try {
        const response = await fetch('http://localhost:11434/api/tags', {
            method: 'GET',
            signal: AbortSignal.timeout(2000), // 2 second timeout
        });
        if (response.ok) {
            const data = await response.json();
            const models = (data.models || []).map((m: any) => m.name);
            return { running: true, models };
        }
    } catch {
        // Ollama not running
    }
    return { running: false, models: [] };
}

/**
 * Get Bolna configuration status and available providers
 */
export async function GET() {
    try {
        const configured = isBolnaConfigured();
        const config = getBolnaConfig();
        
        // Also check if Ollama is running directly
        const ollamaStatus = await checkOllama();
        
        return NextResponse.json({
            configured,
            serverUrl: config?.serverUrl ? maskUrl(config.serverUrl) : null,
            currentConfig: config ? {
                llmProvider: config.llmProvider,
                llmModel: config.llmModel,
                asrProvider: config.asrProvider,
                ttsProvider: config.ttsProvider,
                ttsVoice: config.ttsVoice,
                telephonyProvider: config.telephonyProvider,
                isFullyLocal: config.llmProvider === 'ollama' && config.ttsProvider === 'xtts',
            } : null,
            // Ollama direct status (works without Bolna server)
            ollama: {
                running: ollamaStatus.running,
                models: ollamaStatus.models,
                url: 'http://localhost:11434',
            },
            supportedLLMs: getBolnaSupportedLLMs(),
            supportedTTS: getBolnaSupportedTTS(),
            requirements: {
                required: ['BOLNA_SERVER_URL'],
                optional: [
                    'BOLNA_API_KEY',
                    'BOLNA_LLM_PROVIDER',
                    'BOLNA_LLM_MODEL',
                    'BOLNA_ASR_PROVIDER',
                    'BOLNA_TTS_PROVIDER',
                    'BOLNA_TTS_VOICE',
                    'BOLNA_TELEPHONY_PROVIDER',
                ],
                forLocal: [
                    'Ollama running with llama3.2 or similar',
                    'XTTS server for local TTS',
                    'Deepgram API key for ASR',
                ],
            },
        });
    } catch (error) {
        console.error('Failed to get Bolna config:', error);
        return NextResponse.json({
            configured: false,
            error: 'Failed to fetch Bolna configuration',
        });
    }
}

/**
 * Mask URL for security (show only domain)
 */
function maskUrl(url: string): string {
    try {
        const parsed = new URL(url);
        return `${parsed.protocol}//${parsed.hostname}:${parsed.port || '****'}`;
    } catch {
        return '****';
    }
}
