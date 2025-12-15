import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendBlandCall } from '@/lib/bland';
import { TRUCK_DRIVER_AGENT_CONFIG } from '@/lib/ai-agent-config';

export async function POST(request: Request) {
    try {
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
        let taskPrompt = '';
        
        if (agentId) {
            const agent = await prisma.agent.findUnique({ 
                where: { id: agentId },
                select: { systemPrompt: true, questions: true }
            });
            
            if (agent) {
                const agentQuestions = JSON.parse(agent.questions);
                taskPrompt = `
${agent.systemPrompt}

You are calling ${driver.name}.

Ask these questions one by one:
${agentQuestions.map((q: { text: string }) => `- ${q.text}`).join('\n')}
                `.trim();
            }
        }

        // Fallback to default config
        if (!taskPrompt) {
            taskPrompt = `
${TRUCK_DRIVER_AGENT_CONFIG.systemPrompt}

📞 अनिवार्य स्क्रिप्ट और मुख्य प्रश्न (MANDATORY SCRIPT & CORE QUESTIONS)

Step 1. Greeting
Script: "नमस्कार, मैं ${TRUCK_DRIVER_AGENT_CONFIG.name} बोल रहा हूँ, ${TRUCK_DRIVER_AGENT_CONFIG.context} से। यह एक संक्षिप्त स्टेटस अपडेट कॉल है। क्या अभी आप एक मिनट के लिए बात कर सकते हैं?"

Step 2. Location
Script: "धन्यवाद। कृपया अपना वर्तमान सही स्थान बताएं — जैसे शहर, हाइवे मार्कर, या सबसे नज़दीकी चौराहा।"

Step 3. Haltage Reason
Script: "समझ गया। कृपया बताएं, यह रुकावट किस कारण से हुई है और अब तक कितनी देर से ट्रक रुका हुआ है?"

Step 4. ETA
Script: "आपके अनुमान से, ट्रक फिर से सड़क पर चलने में कितना समय लगेगा — कृपया घंटों या सटीक समय में बताएं।"

Step 5. Closing
Script: "स्पष्ट और तेज़ अपडेट के लिए धन्यवाद। सुरक्षित ड्राइव करें। अलविदा।"

You are calling ${driver.name}. Use their name if appropriate but stick to the script.
            `.trim();
        }

        // Initiate call via Bland AI
        const blandResponse = await sendBlandCall({
            phoneNumber: driver.phone,
            task: taskPrompt,
            model: 'enhanced',
            language: 'hi', // Hindi
        });

        // Save call record and update driver status in parallel
        const [call] = await Promise.all([
            prisma.call.create({
                data: {
                    driverId: driver.id,
                    agentId: agentId || null,
                    blandCallId: blandResponse.call_id,
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
            blandCallId: blandResponse.call_id 
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('Bland Call Error:', message);
        return NextResponse.json(
            { error: message }, 
            { status: 500 }
        );
    }
}
