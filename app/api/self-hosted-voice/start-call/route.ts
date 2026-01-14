import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isVoiceAgentConfigured, getVoiceAgentConfig } from '@/lib/self-hosted-voice-agent';
import { initiateCall, getTelephonyConfig } from '@/lib/telephony';
import { TRUCK_DRIVER_AGENT_CONFIG } from '@/lib/ai-agent-config';

/**
 * Start a call using self-hosted voice agent
 * POST /api/self-hosted-voice/start-call
 * 
 * This uses:
 * - Ollama for AI intelligence
 * - Local TTS for voice
 * - Local ASR for transcription
 * - Indian Telephony Provider (Exotel, Knowlarity, Ozonetel, Plivo, etc.)
 */
export async function POST(request: Request) {
    try {
        // Check if voice agent is configured
        if (!isVoiceAgentConfigured()) {
            const telephonyConfig = getTelephonyConfig();
            return NextResponse.json(
                {
                    error: 'Voice agent not fully configured',
                    details: 'You need to configure a telephony provider',
                    supportedProviders: [
                        'Exotel (Indian) - EXOTEL_API_KEY, EXOTEL_API_TOKEN, EXOTEL_PHONE_NUMBER',
                        'Knowlarity (Indian) - KNOWLARITY_API_KEY, KNOWLARITY_API_TOKEN, KNOWLARITY_PHONE_NUMBER',
                        'Ozonetel (Indian) - OZONETEL_API_KEY, OZONETEL_API_TOKEN, OZONETEL_PHONE_NUMBER',
                        'Plivo (India supported) - PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN, PLIVO_PHONE_NUMBER',
                        'Custom - TELEPHONY_PROVIDER=custom, TELEPHONY_API_URL, etc.',
                    ],
                    help: 'Add credentials for any Indian telephony provider to your .env file',
                    currentConfig: telephonyConfig ? `Detected: ${telephonyConfig.provider}` : 'No provider detected',
                },
                { status: 503 }
            );
        }

        const body = await request.json();
        const { driverId, agentId } = body;

        if (!driverId) {
            return NextResponse.json(
                { error: 'Driver ID is required' },
                { status: 400 }
            );
        }

        // Fetch driver
        const driver = await prisma.driver.findUnique({
            where: { id: driverId },
            select: { id: true, name: true, phone: true, status: true }
        });

        if (!driver) {
            return NextResponse.json(
                { error: 'Driver not found' },
                { status: 404 }
            );
        }

        // Build system prompt
        let systemPrompt = '';
        
        if (agentId) {
            const agent = await prisma.agent.findUnique({
                where: { id: agentId },
                select: { systemPrompt: true, questions: true }
            });

            if (agent) {
                const agentQuestions = JSON.parse(agent.questions);
                systemPrompt = `
${agent.systemPrompt}

You are calling ${driver.name}.

Ask these questions one by one:
${agentQuestions.map((q: { text: string }) => `- ${q.text}`).join('\n')}
                `.trim();
            }
        }

        if (!systemPrompt) {
            systemPrompt = `
${TRUCK_DRIVER_AGENT_CONFIG.systemPrompt}

You are calling ${driver.name}. Conduct a brief status update call in Hindi.
Ask about: current location, reason for haltage, and estimated time to resume.
            `.trim();
        }

        const config = getVoiceAgentConfig();
        const telephonyConfig = getTelephonyConfig()!;
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Initiate call via configured telephony provider (Indian or other)
        const callResponse = await initiateCall({
            to: driver.phone,
            from: telephonyConfig.phoneNumber || '',
            webhookUrl: `${baseUrl}/api/self-hosted-voice/webhook`,
            driverId: driver.id,
            agentId: agentId || null,
            systemPrompt,
        });

        // Save call record
        const call = await prisma.call.create({
            data: {
                driverId: driver.id,
                agentId: agentId || null,
                blandCallId: callResponse.callId, // Reusing field for call ID
                provider: 'self-hosted',
                status: 'queued',
            },
        });

        // Update driver status
        await prisma.driver.update({
            where: { id: driverId },
            data: { status: 'calling' },
        });

        return NextResponse.json({
            success: true,
            callId: call.id,
            telephonyCallId: callResponse.callId,
            provider: 'self-hosted',
            telephonyProvider: telephonyConfig.provider,
            message: 'Call initiated. Voice agent will handle the conversation.',
            components: {
                llm: 'Ollama (local)',
                tts: config.ttsProvider,
                asr: config.asrProvider,
                telephony: telephonyConfig.provider,
            },
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('Self-hosted voice call error:', message);
        
        return NextResponse.json(
            { 
                success: false,
                error: message,
            },
            { status: 500 }
        );
    }
}


