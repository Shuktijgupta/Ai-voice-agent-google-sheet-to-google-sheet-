import { NextResponse } from 'next/server';
import { isClickToCallConfigured, getClickToCallConfig } from '@/lib/click-to-call';

/**
 * Get click-to-call configuration status
 * Returns whether click-to-call is configured and available features
 */
export async function GET() {
    try {
        const isConfigured = isClickToCallConfigured();
        const config = getClickToCallConfig();

        return NextResponse.json({
            configured: isConfigured,
            virtualNumber: config?.virtualNumber ? maskPhoneNumber(config.virtualNumber) : null,
            agentNumber: config?.agentNumber ? maskPhoneNumber(config.agentNumber) : null,
            webhookUrl: config?.webhookUrl || null,
            features: {
                clickToCall: isConfigured,
                callRecording: isConfigured,
                callTranscription: false,
                webRTC: false,
            },
            provider: isConfigured ? 'tata' : null,
        });

    } catch (error) {
        console.error('Click-to-call config error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Mask phone number for security (show last 4 digits)
 */
function maskPhoneNumber(phone: string): string {
    if (phone.length <= 4) return '****';
    return '*'.repeat(phone.length - 4) + phone.slice(-4);
}

