import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendElevenLabsCall, isElevenLabsConfigured } from '@/lib/elevenlabs';
import { TRUCK_DRIVER_AGENT_CONFIG } from '@/lib/ai-agent-config';

export async function POST(request: Request) {
    try {
        // Check if ElevenLabs is configured
        if (!isElevenLabsConfigured()) {
            return NextResponse.json(
                { error: 'ElevenLabs is not configured. Please add ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID to .env' },
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

        // Initiate call via ElevenLabs
        const elevenLabsResponse = await sendElevenLabsCall({
            phoneNumber: driver.phone,
            agentId: process.env.ELEVENLABS_AGENT_ID!,
            systemPrompt,
            firstMessage,
            language: 'hi',
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
                    blandCallId: elevenLabsResponse.conversation_id, // Reusing field for conversation ID
                    provider: 'elevenlabs',
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
            conversationId: elevenLabsResponse.conversation_id,
            provider: 'elevenlabs',
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('ElevenLabs Call Error:', message);
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}

