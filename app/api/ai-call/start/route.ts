import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Unified AI Call API
 * Routes to the appropriate provider (Bland AI or ElevenLabs) based on settings
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { driverId, agentId, provider: overrideProvider } = body;

        if (!driverId) {
            return NextResponse.json(
                { error: 'Driver ID is required' },
                { status: 400 }
            );
        }

        // Get the default provider from settings, or use override
        let provider = overrideProvider;
        
        if (!provider) {
            const setting = await prisma.settings.findUnique({
                where: { key: 'default_ai_caller_provider' },
            });
            provider = setting?.value || 'bland';
        }

        // Determine the API endpoint based on provider
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        let apiEndpoint: string;

        switch (provider) {
            case 'elevenlabs':
                apiEndpoint = `${baseUrl}/api/elevenlabs/start-call`;
                break;
            case 'bolna':
                apiEndpoint = `${baseUrl}/api/bolna/start-call`;
                break;
            case 'bland':
            default:
                apiEndpoint = `${baseUrl}/api/bland/start-call`;
                break;
        }

        // Forward the request to the appropriate provider
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ driverId, agentId }),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json({
            ...data,
            provider,
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('AI Call Error:', message);
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
