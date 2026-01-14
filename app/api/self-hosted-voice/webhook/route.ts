import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAgentResponse, getVoiceAgentConfig } from '@/lib/self-hosted-voice-agent';
import { parseWebhookData, generateProviderResponse } from '@/lib/telephony-webhook';
import { getTelephonyConfig } from '@/lib/telephony';
import { TRUCK_DRIVER_AGENT_CONFIG } from '@/lib/ai-agent-config';

/**
 * Telephony Webhook Handler
 * Handles incoming call events from any telephony provider (Exotel, Knowlarity, Ozonetel, Plivo, etc.)
 * 
 * This endpoint:
 * 1. Receives call events from telephony provider
 * 2. Uses Ollama for AI responses (local)
 * 3. Uses provider TTS for voice (can be replaced with local TTS)
 * 4. Uses provider ASR for transcription (can be replaced with local ASR)
 * 5. Records the conversation
 * 6. Generates transcript and summary
 */
export async function POST(request: Request) {
    try {
        // Get telephony provider
        const telephonyConfig = getTelephonyConfig();
        const provider = telephonyConfig?.provider || 'custom';
        
        // Parse webhook data based on provider
        const webhookData = await parseWebhookData(request, provider);
        
        const { callId: callSid, status: callStatus, speechResult, digits, recordingUrl, duration: recordingDuration } = webhookData;

        if (!callSid) {
            console.error('No call ID in webhook request');
            return new Response('Missing call ID', { status: 400 });
        }

        // Find the call record
        const call = await prisma.call.findFirst({
            where: { blandCallId: callSid }, // Reusing field for any provider's call ID
            include: { driver: true, agent: true },
        });

        if (!call) {
            console.error('Call not found for ID:', callSid);
            // Still return OK to avoid provider retries
            return new Response('OK', { status: 200 });
        }

        // Handle call completion
        if (callStatus === 'completed') {
            await processCompletedCall(call, recordingUrl, recordingDuration);
            return new Response('OK', { status: 200 });
        }

        // Handle speech input from user
        if (speechResult) {
            return await handleUserSpeech(call, speechResult, callSid);
        }

        // Initial call - start conversation
        if (callStatus === 'ringing' || callStatus === 'in-progress') {
            return generateTwiMLResponse(call, 'greeting', callSid);
        }

        // Handle DTMF (keypad) input if needed
        if (digits) {
            return handleDTMF(call, digits);
        }

        // Default response
        return new Response('OK', { status: 200 });

    } catch (error) {
        console.error('Webhook error:', error);
        return new Response('Error', { status: 500 });
    }
}

/**
 * Generate response for telephony provider (XML/JSON format)
 */
async function generateTwiMLResponse(call: any, stage: 'greeting' | 'listening' | 'speaking', callSid: string): Promise<Response> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const webhookUrl = `${baseUrl}/api/self-hosted-voice/webhook`;

    if (stage === 'greeting') {
        // Build system prompt
        let systemPrompt = '';
        if (call.agent) {
            const agentQuestions = JSON.parse(call.agent.questions);
            systemPrompt = `
${call.agent.systemPrompt}

You are calling ${call.driver.name}. Ask these questions one by one:
${agentQuestions.map((q: { text: string }) => `- ${q.text}`).join('\n')}
            `.trim();
        } else {
            systemPrompt = `
${TRUCK_DRIVER_AGENT_CONFIG.systemPrompt}

You are calling ${call.driver.name}. Conduct a brief status update call in Hindi.
Ask about: current location, reason for haltage, and estimated time to resume.
            `.trim();
        }

        // Generate greeting using Ollama
        const conversationHistory: Array<{ role: 'agent' | 'user'; text: string }> = [];
        const greeting = await generateAgentResponse(conversationHistory, systemPrompt);
        
        // Save conversation start
        await prisma.call.update({
            where: { id: call.id },
            data: {
                transcript: JSON.stringify([{ role: 'agent', text: greeting, timestamp: new Date() }]),
                status: 'in-progress',
            },
        });

        // Generate XML response for telephony provider
        // Most providers (Exotel, Knowlarity, etc.) support TwiML-like XML or similar format
        const { getTelephonyConfig } = await import('@/lib/telephony');
        const telephonyConfig = getTelephonyConfig();
        
        // Generate provider-specific response
        return generateProviderResponse(
            telephonyConfig?.provider || 'custom',
            greeting,
            webhookUrl,
            { gather: true, language: 'hi-IN' }
        );

        return new Response(twiml, {
            headers: { 'Content-Type': 'text/xml' },
        });
    }

    return new Response('OK', { status: 200 });
}

/**
 * Handle user speech input
 */
async function handleUserSpeech(call: any, userSpeech: string, callSid: string): Promise<Response> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const webhookUrl = `${baseUrl}/api/self-hosted-voice/webhook`;

    // Get existing conversation
    let conversationHistory: Array<{ role: 'agent' | 'user'; text: string }> = [];
    if (call.transcript) {
        try {
            conversationHistory = JSON.parse(call.transcript);
        } catch (e) {
            conversationHistory = [];
        }
    }

    // Add user's speech
    conversationHistory.push({
        role: 'user',
        text: userSpeech,
        timestamp: new Date(),
    });

    // Build system prompt
    let systemPrompt = '';
    if (call.agent) {
        const agentQuestions = JSON.parse(call.agent.questions);
        systemPrompt = `
${call.agent.systemPrompt}

You are calling ${call.driver.name}. Ask these questions one by one:
${agentQuestions.map((q: { text: string }) => `- ${q.text}`).join('\n')}
        `.trim();
    } else {
        systemPrompt = `
${TRUCK_DRIVER_AGENT_CONFIG.systemPrompt}

You are calling ${call.driver.name}. Conduct a brief status update call in Hindi.
Ask about: current location, reason for haltage, and estimated time to resume.
        `.trim();
    }

    // Generate response using Ollama
    const agentResponse = await generateAgentResponse(conversationHistory, systemPrompt);

    // Add agent's response
    conversationHistory.push({
        role: 'agent',
        text: agentResponse,
        timestamp: new Date(),
    });

    // Save updated conversation
    await prisma.call.update({
        where: { id: call.id },
        data: {
            transcript: JSON.stringify(conversationHistory),
        },
    });

    // Continue conversation or end
    const questionCount = conversationHistory.filter(m => m.role === 'agent').length;
    const shouldContinue = questionCount < 5; // Limit to 5 exchanges

    // Generate provider-specific response
    const { getTelephonyConfig } = await import('@/lib/telephony');
    const telephonyConfig = getTelephonyConfig();
    
    if (shouldContinue) {
        return generateProviderResponse(
            telephonyConfig?.provider || 'custom',
            agentResponse,
            webhookUrl,
            { gather: true, language: 'hi-IN' }
        );
    } else {
        const closingText = `${agentResponse}\n\nस्पष्ट अपडेट के लिए धन्यवाद। सुरक्षित ड्राइव करें। अलविदा।`;
        return generateProviderResponse(
            telephonyConfig?.provider || 'custom',
            closingText,
            webhookUrl,
            { gather: false, language: 'hi-IN' }
        );
    }
}

/**
 * Handle DTMF input
 */
function handleDTMF(call: any, digits: string): Response {
    // Handle keypad input if needed
    return new Response('OK', { status: 200 });
}

/**
 * Process completed call
 */
async function processCompletedCall(
    call: any,
    recordingUrl: string | null,
    duration: string | null
) {
    try {
        // Get conversation transcript
        let transcript = '';
        let conversationHistory: Array<{ role: 'agent' | 'user'; text: string }> = [];
        
        if (call.transcript) {
            try {
                conversationHistory = JSON.parse(call.transcript);
                transcript = conversationHistory
                    .map(msg => `${msg.role === 'agent' ? 'Agent' : 'User'}: ${msg.text}`)
                    .join('\n');
            } catch (e) {
                transcript = call.transcript;
            }
        }

        // Generate summary using Ollama
        const summaryPrompt = `Summarize this phone conversation in 2-3 sentences in Hindi:

${transcript}

Summary:`;
        
        const { generateWithOllama } = await import('@/lib/ollama');
        const summaryResult = await generateWithOllama(summaryPrompt);
        const summary = summaryResult.response;

        // Extract answers using Ollama
        const answersPrompt = `Extract the user's answers to these questions from the conversation:

1. Current location
2. Reason for haltage
3. Estimated time to resume

Conversation:
${transcript}

Extract answers in JSON format:`;
        
        const answersResult = await generateWithOllama(answersPrompt);
        const answers = answersResult.response;

        const durationSeconds = duration ? parseInt(duration) : undefined;
        const provider = call.provider || 'self-hosted';

        // Record cost
        try {
            const { recordCallCost } = await import('@/lib/cost-tracker');
            await recordCallCost(call.id, provider, durationSeconds || 0);
        } catch (costError) {
            console.error('Failed to record call cost:', costError);
        }

        // Update call record with all information
        await prisma.call.update({
            where: { id: call.id },
            data: {
                status: 'completed',
                recordingUrl: recordingUrl || undefined,
                durationSeconds: durationSeconds,
                endTime: new Date(),
                transcript: transcript,
                summary: summary,
                analysis: answers,
            },
        });

        // Update driver status
        await prisma.driver.update({
            where: { id: call.driverId },
            data: { status: 'contacted' },
        });

        console.log(`Call ${call.id} completed. Duration: ${duration}s, Transcript: ${transcript.length} chars`);

    } catch (error) {
        console.error('Error processing completed call:', error);
    }
}

