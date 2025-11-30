import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendBlandCall } from '@/lib/bland';
import { TRUCK_DRIVER_AGENT_CONFIG } from '@/lib/ai-agent-config';

export async function POST(request: Request) {
    try {
        console.log('Received start-call request');
        const body = await request.json();
        console.log('Request body:', body);
        const { driverId, agentId } = body;

        if (!driverId) {
            return NextResponse.json({ error: 'Driver ID is required' }, { status: 400 });
        }

        const driver = await prisma.driver.findUnique({
            where: { id: driverId },
        });

        if (!driver) {
            return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
        }

        let taskPrompt = '';
        let questions = TRUCK_DRIVER_AGENT_CONFIG.questions;

        if (agentId) {
            const agent = await prisma.agent.findUnique({ where: { id: agentId } });
            if (agent) {
                const agentQuestions = JSON.parse(agent.questions);
                questions = agentQuestions;

                taskPrompt = `
                    ${agent.systemPrompt}
                    
                    You are calling ${driver.name}.
                    
                    Ask these questions one by one:
                    ${agentQuestions.map((q: any) => `- ${q.text}`).join('\n')}
                `;
            }
        }

        if (!taskPrompt) {
            // Fallback to default config
            taskPrompt = `
                You are an AI Recruiter for a trucking company. Your name is ${TRUCK_DRIVER_AGENT_CONFIG.name}.
                You are calling ${driver.name}.
                Your goal is to screen them for a truck driver position.
                
                Here is the context:
                ${TRUCK_DRIVER_AGENT_CONFIG.context}

                Ask these questions one by one:
                ${TRUCK_DRIVER_AGENT_CONFIG.questions.map(q => `- ${q.text}`).join('\n')}

                Be professional, polite, and concise. Speak in Hindi/Hinglish as appropriate for the context.
            `;
        }

        // Initiate Call
        const blandResponse = await sendBlandCall(driver.phone, taskPrompt);

        // Save Call Record
        const call = await prisma.call.create({
            data: {
                driverId: driver.id,
                agentId: agentId || null,
                blandCallId: blandResponse.call_id,
                status: 'queued',
            },
        });

        // Update Driver Status
        await prisma.driver.update({
            where: { id: driverId },
            data: { status: 'calling' },
        });

        return NextResponse.json({ success: true, callId: call.id, blandCallId: blandResponse.call_id });

    } catch (error: any) {
        console.error('Bland Call Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
