import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendBolnaCall, isBolnaConfigured, createBolnaAgentConfig, getBolnaConfig } from '@/lib/bolna';
import { TRUCK_DRIVER_AGENT_CONFIG } from '@/lib/ai-agent-config';

export async function POST(request: Request) {
    try {
        // Check if Bolna is configured
        if (!isBolnaConfigured()) {
            return NextResponse.json(
                { error: 'Bolna is not configured. Please add BOLNA_SERVER_URL to .env' },
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

        // Build task prompt
        let systemPrompt = '';
        let firstMessage = '';

        if (agentId) {
            const agent = await prisma.agent.findUnique({
                where: { id: agentId },
                select: { name: true, systemPrompt: true, questions: true }
            });

            if (agent) {
                const agentQuestions = JSON.parse(agent.questions);
                systemPrompt = `
${agent.systemPrompt}

You are calling ${driver.name}.

Ask these questions one by one:
${agentQuestions.map((q: { text: string }) => `- ${q.text}`).join('\n')}
                `.trim();
                
                firstMessage = `Hello, this is an automated call for ${driver.name}. How are you today?`;
            }
        }

        // Fallback to default config
        if (!systemPrompt) {
            systemPrompt = `
${TRUCK_DRIVER_AGENT_CONFIG.systemPrompt}

You are calling ${driver.name}. Conduct a brief status update call in Hindi.
Ask about: current location, reason for haltage, and estimated time to resume.
            `.trim();
            
            firstMessage = `नमस्कार, मैं ${TRUCK_DRIVER_AGENT_CONFIG.name} बोल रहा हूँ। क्या अभी आप बात कर सकते हैं?`;
        }

        // Get Bolna config
        const bolnaConfig = getBolnaConfig();

        // Create agent configuration
        const agentConfig = createBolnaAgentConfig({
            name: 'AI Voice Agent',
            systemPrompt,
            firstMessage,
            language: 'hi',
            config: bolnaConfig || undefined,
        });

        // Initiate call via Bolna
        const bolnaResponse = await sendBolnaCall({
            phoneNumber: driver.phone,
            agentConfig,
            metadata: {
                driver_id: driver.id,
                driver_name: driver.name,
            },
        });

        // Save call record and update driver status in parallel
        const [call] = await Promise.all([
            prisma.call.create({
                data: {
                    driverId: driver.id,
                    agentId: agentId || null,
                    blandCallId: bolnaResponse.callId, // Reusing field for call ID
                    provider: 'bolna',
                    status: 'queued',
                },
            }),
            prisma.driver.update({
                where: { id: driverId },
                data: { status: 'calling' },
            })
        ]);

        return NextResponse.json({
            success: true,
            callId: call.id,
            bolnaCallId: bolnaResponse.callId,
            agentId: bolnaResponse.agentId,
            provider: 'bolna',
            config: {
                llm: bolnaConfig?.llmProvider,
                tts: bolnaConfig?.ttsProvider,
                local: bolnaConfig?.llmProvider === 'ollama' && bolnaConfig?.ttsProvider === 'xtts',
            },
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('Bolna Call Error:', message);
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
