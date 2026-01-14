import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
    retryWithBackoff, 
    withProviderFailover, 
    getUserFriendlyError, 
    getErrorRecoverySuggestions,
    categorizeError 
} from '@/lib/error-handler';

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

        // Check for removed Twilio provider
        if (provider === 'twilio-voice-ai') {
            return NextResponse.json({
                error: 'Twilio provider has been removed. Please use an Indian telephony provider (Exotel, Knowlarity, Ozonetel, Plivo) or self-hosted.',
            }, { status: 400 });
        }

        switch (provider) {
            case 'ollama':
                // Ollama alone can't make calls - redirect to ollama-with-telephony if telephony available
                const hasBland = !!process.env.BLAND_API_KEY;
                const { isTelephonyConfigured } = await import('@/lib/telephony');
                const hasTelephony = isTelephonyConfigured();
                
                if (hasBland || hasTelephony) {
                    apiEndpoint = `${baseUrl}/api/ai-call/ollama-with-telephony`;
                } else {
                    return NextResponse.json({
                        error: 'Ollama cannot make phone calls alone. You need a telephony provider.',
                        details: 'Ollama is an LLM that generates text, but cannot dial phone numbers.',
                        solution: 'Either: 1) Use "bland" provider for calls, or 2) Configure an Indian telephony provider (Exotel, Knowlarity, etc.)',
                        help: 'Set default provider to "bland" in settings, or configure EXOTEL_API_KEY/KNOWLARITY_API_KEY/etc. to use Ollama + telephony together',
                    }, { status: 400 });
                }
                break;
            case 'elevenlabs':
                apiEndpoint = `${baseUrl}/api/elevenlabs/start-call`;
                break;
            case 'bolna':
                apiEndpoint = `${baseUrl}/api/bolna/start-call`;
                break;
            case 'self-hosted':
                apiEndpoint = `${baseUrl}/api/self-hosted-voice/start-call`;
                break;
            case 'bland':
            default:
                apiEndpoint = `${baseUrl}/api/bland/start-call`;
                break;
        }

        // Forward the request to the appropriate provider with retry and failover
        const providers = [
            {
                name: provider,
                fn: async () => {
                    const response = await retryWithBackoff(
                        () => fetch(apiEndpoint, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ driverId, agentId }),
                        }),
                        { maxRetries: 3 },
                        (attempt, error) => {
                            console.log(`Retry attempt ${attempt} for ${provider}:`, error.message);
                        }
                    );

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || `HTTP ${response.status}`);
                    }

                    return response.json();
                }
            }
        ];

        // Add failover providers if available
        const hasBland = !!process.env.BLAND_API_KEY;
        const { isTelephonyConfigured } = await import('@/lib/telephony');
        const hasTelephony = isTelephonyConfigured();

        if (provider !== 'bland' && hasBland) {
            providers.push({
                name: 'bland',
                fn: async () => {
                    const response = await fetch(`${baseUrl}/api/bland/start-call`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ driverId, agentId }),
                    });
                    if (!response.ok) throw new Error(`Bland AI failed: ${response.status}`);
                    return response.json();
                }
            });
        }

        if (provider !== 'self-hosted' && hasTelephony) {
            providers.push({
                name: 'self-hosted',
                fn: async () => {
                    const response = await fetch(`${baseUrl}/api/self-hosted-voice/start-call`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ driverId, agentId }),
                    });
                    if (!response.ok) throw new Error(`Self-hosted failed: ${response.status}`);
                    return response.json();
                }
            });
        }

        const data = await withProviderFailover(
            providers,
            (from, to, error) => {
                console.log(`Provider failover: ${from} -> ${to}`, error.message);
            }
        );

        return NextResponse.json({
            ...data,
            provider: data.provider || provider,
        });

    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        const category = categorizeError(err);
        const userMessage = getUserFriendlyError(err);
        const suggestions = getErrorRecoverySuggestions(err);

        console.error('AI Call Error:', {
            message: err.message,
            category,
            stack: err.stack
        });

        return NextResponse.json(
            { 
                error: userMessage,
                category,
                suggestions,
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
            },
            { status: category === 'authentication' ? 401 : category === 'validation' ? 400 : 500 }
        );
    }
}
