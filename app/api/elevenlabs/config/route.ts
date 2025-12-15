import { NextResponse } from 'next/server';
import { isElevenLabsConfigured, getElevenLabsConfig } from '@/lib/elevenlabs';

/**
 * Get ElevenLabs configuration status
 */
export async function GET() {
    try {
        const isConfigured = isElevenLabsConfigured();
        const config = getElevenLabsConfig();

        return NextResponse.json({
            configured: isConfigured,
            agentId: config?.agentId ? maskString(config.agentId) : null,
            webhookUrl: config?.webhookUrl || null,
            features: {
                voiceCalls: isConfigured,
                conversationalAI: isConfigured,
                multiLanguage: isConfigured,
                voiceCloning: false, // Requires additional setup
            },
            provider: 'elevenlabs',
        });

    } catch (error) {
        console.error('ElevenLabs config error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Mask a string for security (show first 4 and last 4 chars)
 */
function maskString(str: string): string {
    if (str.length <= 8) return '****';
    return str.slice(0, 4) + '****' + str.slice(-4);
}
