import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateWithOllama, getDefaultOllamaConfig, checkOllamaHealth } from '@/lib/ollama';
import { sendBlandCall } from '@/lib/bland';
import { TRUCK_DRIVER_AGENT_CONFIG } from '@/lib/ai-agent-config';

/**
 * Start an AI call using Ollama for LLM + Telephony provider for actual calling
 * POST /api/ai-call/ollama-with-telephony
 * 
 * This uses Ollama for local AI intelligence but requires a telephony provider
 * (Bland AI, Exotel, Knowlarity, Ozonetel, Plivo, etc.) to actually make the phone call.
 */
export async function POST(request: Request) {
    try {
        // Check Ollama health first
        const health = await checkOllamaHealth();
        if (!health.healthy) {
            return NextResponse.json(
                { 
                    error: 'Ollama is not available',
                    details: health.error,
                    help: 'Make sure Ollama is running: brew services start ollama (macOS) or ollama serve (Linux)',
                },
                { status: 503 }
            );
        }

        // Check if we have a telephony provider configured
        const hasBland = !!process.env.BLAND_API_KEY;
        const { isTelephonyConfigured } = await import('@/lib/telephony');
        const hasTelephony = isTelephonyConfigured();
        
        if (!hasBland && !hasTelephony) {
            return NextResponse.json(
                { 
                    error: 'No telephony provider configured',
                    details: 'Ollama can generate AI responses, but you need a telephony provider to make actual phone calls.',
                    help: 'Configure either BLAND_API_KEY or an Indian telephony provider (Exotel, Knowlarity, etc.) in .env',
                    options: {
                        bland: 'Add BLAND_API_KEY to .env (recommended for voice AI)',
                        indian: 'Add EXOTEL_API_KEY, KNOWLARITY_API_KEY, OZONETEL_API_KEY, or PLIVO_AUTH_ID to .env',
                    }
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

        // Build system prompt using Ollama to generate the conversation script
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

        // Fallback to default config
        if (!systemPrompt) {
            systemPrompt = `
${TRUCK_DRIVER_AGENT_CONFIG.systemPrompt}

You are calling ${driver.name}. Conduct a brief status update call in Hindi.
Ask about: current location, reason for haltage, and estimated time to resume.
            `.trim();
        }

        // Use Ollama to generate the conversation script/prompt for the telephony provider
        const ollamaConfig = getDefaultOllamaConfig();
        const ollamaPrompt = `Generate a concise conversation script in Hindi for calling ${driver.name}. 
The script should be professional and ask about their current location, reason for any haltage, and estimated time to resume.
Keep it brief and natural.`;

        const ollamaResult = await generateWithOllama(ollamaPrompt, ollamaConfig);
        
        // Use the Ollama-generated script with Bland AI (or other telephony provider)
        const taskPrompt = `${systemPrompt}\n\nGenerated conversation approach:\n${ollamaResult.response}`;

        // Make the actual phone call using Bland AI
        let callResponse;
        let callId;
        
        if (hasBland) {
            const blandResponse = await sendBlandCall({
                phoneNumber: driver.phone,
                task: taskPrompt,
                model: 'enhanced',
                language: 'hi',
            });
            
            callResponse = blandResponse;
            callId = blandResponse.call_id;
        } else if (hasTelephony) {
            // Use Indian telephony provider
            const { initiateCall, getTelephonyConfig } = await import('@/lib/telephony');
            const telephonyConfig = getTelephonyConfig()!;
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            
            const callResult = await initiateCall({
                to: driver.phone,
                from: telephonyConfig.phoneNumber || '',
                webhookUrl: `${baseUrl}/api/self-hosted-voice/webhook`,
                driverId: driver.id,
                agentId: agentId || null,
                systemPrompt: taskPrompt,
            });
            
            callId = callResult.callId;
        } else {
            return NextResponse.json(
                { error: 'No telephony provider available. Please configure Bland AI or an Indian telephony provider.' },
                { status: 503 }
            );
        }

        // Save call record
        const call = await prisma.call.create({
            data: {
                driverId: driver.id,
                agentId: agentId || null,
                blandCallId: callId,
                provider: 'ollama+bland', // Indicates Ollama LLM + Bland telephony
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
            telephonyCallId: callId,
            provider: 'ollama+bland',
            local: true,
            message: 'Call initiated using Ollama (local AI) + Bland AI (telephony)',
            ollama: {
                model: ollamaResult.model,
                used: true,
            },
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('Ollama + Telephony Call Error:', message);
        
        return NextResponse.json(
            { 
                success: false,
                error: message,
            },
            { status: 500 }
        );
    }
}

