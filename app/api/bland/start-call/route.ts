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
            // Fallback to default config with User's Specific Script
            taskPrompt = `
${TRUCK_DRIVER_AGENT_CONFIG.systemPrompt}

📞 अनिवार्य स्क्रिप्ट और मुख्य प्रश्न (MANDATORY SCRIPT & CORE QUESTIONS)

Step 1. Greeting
Script: “नमस्कार, मैं ${TRUCK_DRIVER_AGENT_CONFIG.name} बोल रहा हूँ, ${TRUCK_DRIVER_AGENT_CONFIG.context} से। यह एक संक्षिप्त स्टेटस अपडेट कॉल है। क्या अभी आप एक मिनट के लिए बात कर सकते हैं?”

Step 2. Location
Script: “धन्यवाद। कृपया अपना वर्तमान सही स्थान बताएं — जैसे शहर, हाइवे मार्कर, या सबसे नज़दीकी चौराहा।”
(Goal: सटीक स्थान / Exact Location)

Step 3. Haltage Reason
Script: “समझ गया। कृपया बताएं, यह रुकावट किस कारण से हुई है और अब तक कितनी देर से ट्रक रुका हुआ है?”
(Goal: रुकावट का कारण / Reason of Haltage)

Step 4. ETA
Script: “आपके अनुमान से, ट्रक फिर से सड़क पर चलने में कितना समय लगेगा — कृपया घंटों या सटीक समय में बताएं।”
(Goal: सड़क पर वापस आने का समय / ETA Back On Road)

Step 5. Closing
Script: “स्पष्ट और तेज़ अपडेट के लिए धन्यवाद। सुरक्षित ड्राइव करें। अलविदा।”

📤 अनिवार्य डेटा आउटपुट प्रारूप (MANDATORY DATA OUTPUT FORMAT)
कॉल समाप्त होने पर, नीचे दिए गए सटीक प्रारूप में स्टेटस लॉग तैयार करें:

Field Example (Hindi)
Company: Efleet Systems
Agent ID: 007
Call Outcome: SUCCESS / UNANSWERED / DECLINED
Current Location: [Driver's Answer]
Delay Reason: [Driver's Answer]
Delay Duration (Total): [Driver's Answer]
ETA Back On Road: [Driver's Answer]

You are calling ${driver.name}. Use their name if appropriate but stick to the script.
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
