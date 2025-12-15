import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isBolnaConfigured, getBolnaConfig } from '@/lib/bolna';

const DEFAULT_PROVIDER = 'bland';
const SETTING_KEY = 'default_ai_caller_provider';
const VALID_PROVIDERS = ['bland', 'elevenlabs', 'bolna'];

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
                    configured: bolnaConfigured,
                    description: bolnaConfig 
                        ? `Local AI with ${bolnaConfig.llmProvider}/${bolnaConfig.llmModel}` 
                        : 'Self-hosted voice AI with local models',
                    local: true,
                    config: bolnaConfig ? {
                        llm: `${bolnaConfig.llmProvider}/${bolnaConfig.llmModel}`,
                        tts: bolnaConfig.ttsProvider,
                        isFullyLocal: bolnaConfig.llmProvider === 'ollama' && bolnaConfig.ttsProvider === 'xtts',
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
