import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isBolnaConfigured, getBolnaConfig } from '@/lib/bolna';
import { checkOllamaHealth } from '@/lib/ollama';
import { isVoiceAgentConfigured } from '@/lib/self-hosted-voice-agent';

const DEFAULT_PROVIDER = 'bland';
const SETTING_KEY = 'default_ai_caller_provider';
const VALID_PROVIDERS = ['bland', 'elevenlabs', 'bolna', 'ollama', 'self-hosted'];

/**
 * Get the default AI caller provider
 */
export async function GET() {
    try {
        const setting = await prisma.settings.findUnique({
            where: { key: SETTING_KEY },
        });

        // Check which providers are configured
        const blandConfigured = !!process.env.BLAND_API_KEY;
        const elevenLabsConfigured = !!(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID);
        const bolnaConfigured = isBolnaConfigured();
        const bolnaConfig = getBolnaConfig();
        
        // Check if Ollama is running directly (local AI)
        const ollamaHealth = await checkOllamaHealth();
        const ollamaConfigured = ollamaHealth.healthy && ollamaHealth.models.length > 0;
        
        // Check self-hosted voice agent (Ollama + Telephony provider)
        const selfHostedConfigured = isVoiceAgentConfigured();
        
        // Get telephony provider info
        const { getTelephonyConfig } = await import('@/lib/telephony');
        const telephonyConfig = getTelephonyConfig();

        return NextResponse.json({
            provider: setting?.value || DEFAULT_PROVIDER,
            availableProviders: [
                {
                    id: 'bland',
                    name: 'Bland AI',
                    configured: blandConfigured,
                    description: 'AI-powered phone calling API',
                    local: false,
                },
                {
                    id: 'elevenlabs',
                    name: 'ElevenLabs',
                    configured: elevenLabsConfigured,
                    description: 'Conversational AI with premium voices',
                    local: false,
                },
                {
                    id: 'bolna',
                    name: 'Bolna (Local AI)',
                    configured: bolnaConfigured || ollamaConfigured, // Show as configured if Ollama is running
                    description: bolnaConfig 
                        ? `Local AI with ${bolnaConfig.llmProvider}/${bolnaConfig.llmModel}` 
                        : ollamaConfigured
                        ? `Local AI with Ollama (${ollamaHealth.models[0]?.name || 'model ready'})`
                        : 'Self-hosted voice AI with local models',
                    local: true,
                    config: bolnaConfig ? {
                        llm: `${bolnaConfig.llmProvider}/${bolnaConfig.llmModel}`,
                        tts: bolnaConfig.ttsProvider,
                        isFullyLocal: bolnaConfig.llmProvider === 'ollama' && bolnaConfig.ttsProvider === 'xtts',
                    } : ollamaConfigured ? {
                        llm: `ollama/${ollamaHealth.models[0]?.name || 'llama3.2:3b'}`,
                        tts: 'not configured',
                        isFullyLocal: true,
                    } : null,
                },
                {
                    id: 'ollama',
                    name: 'Ollama (Direct Local AI)',
                    configured: ollamaConfigured,
                    description: ollamaConfigured 
                        ? `Local AI running with ${ollamaHealth.models.length} model(s)` 
                        : 'Direct local AI using Ollama',
                    local: true,
                    config: ollamaConfigured ? {
                        llm: `ollama/${ollamaHealth.models[0]?.name || 'llama3.2:3b'}`,
                        models: ollamaHealth.models.map(m => m.name),
                        isFullyLocal: true,
                    } : null,
                },
                {
                    id: 'self-hosted',
                    name: 'Self-Hosted Voice Agent',
                    configured: selfHostedConfigured,
                    description: selfHostedConfigured
                        ? `Fully self-hosted: Ollama (LLM) + ${telephonyConfig?.provider === 'tata' ? 'Tata SmartFlo' : telephonyConfig?.provider === 'exotel' ? 'Exotel' : telephonyConfig?.provider === 'knowlarity' ? 'Knowlarity' : telephonyConfig?.provider === 'ozonetel' ? 'Ozonetel' : telephonyConfig?.provider === 'plivo' ? 'Plivo' : telephonyConfig?.provider || 'Telephony'} - Makes calls, speaks, listens, records!`
                        : 'Complete self-hosted solution - requires telephony provider credentials (Exotel, Knowlarity, Ozonetel, Tata SmartFlo, Plivo, etc.)',
                    local: true,
                    config: selfHostedConfigured ? {
                        llm: `ollama/${ollamaHealth.models[0]?.name || 'llama3.2:3b'}`,
                        telephony: telephonyConfig?.provider === 'tata' ? 'Tata SmartFlo' : telephonyConfig?.provider || 'not configured',
                        tts: 'Provider TTS (can replace with local)',
                        asr: 'Provider ASR (can replace with local)',
                        features: ['Call recording', 'Transcript generation', 'Call summary', 'Answer extraction'],
                    } : null,
                },
            ],
        });
    } catch (error) {
        console.error('Failed to get provider setting:', error);
        return NextResponse.json({
            provider: DEFAULT_PROVIDER,
            availableProviders: [],
            error: 'Failed to fetch settings',
        });
    }
}

/**
 * Set the default AI caller provider
 */
export async function POST(request: Request) {
    try {
        const { provider } = await request.json();

        if (!provider || !VALID_PROVIDERS.includes(provider)) {
            return NextResponse.json(
                { error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` },
                { status: 400 }
            );
        }

        // Upsert the setting
        await prisma.settings.upsert({
            where: { key: SETTING_KEY },
            update: { value: provider },
            create: { id: SETTING_KEY, key: SETTING_KEY, value: provider },
        });

        const providerNames: Record<string, string> = {
            bland: 'Bland AI',
            elevenlabs: 'ElevenLabs',
            bolna: 'Bolna (Local AI)',
        };

        return NextResponse.json({
            success: true,
            provider,
            message: `Default AI caller provider set to ${providerNames[provider] || provider}`,
        });
    } catch (error) {
        console.error('Failed to set provider setting:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to save setting' },
            { status: 500 }
        );
    }
}
