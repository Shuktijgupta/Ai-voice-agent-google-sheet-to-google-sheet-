import { TRUCK_DRIVER_AGENT_CONFIG } from './ai-agent-config';

const VAPI_API_URL = 'https://api.vapi.ai';

export const vapi = {
    /**
     * Start an outbound call via Vapi
     */
    startCall: async (name: string, phoneNumber: string) => {
        const privateKey = process.env.VAPI_PRIVATE_KEY;
        const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;

        if (!privateKey || !phoneNumberId) {
            throw new Error('Missing VAPI_PRIVATE_KEY or VAPI_PHONE_NUMBER_ID');
        }

        const response = await fetch(`${VAPI_API_URL}/call`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${privateKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phoneNumberId: phoneNumberId,
                customer: {
                    number: phoneNumber,
                    name: name,
                },
                assistant: {
                    firstMessage: "नमस्ते, क्या मैं " + name + " से बात कर सकती हूँ?",
                    model: {
                        provider: "openai",
                        model: "gpt-4",
                        messages: [
                            {
                                role: "system",
                                content: TRUCK_DRIVER_AGENT_CONFIG.systemPrompt
                            }
                        ]
                    },
                    voice: {
                        provider: "11labs",
                        voiceId: "sarah", // Default Sarah voice, can be changed to a Hindi supporting voice
                    },
                    transcriber: {
                        provider: "deepgram",
                        model: "nova-2",
                        language: "hi" // Hindi transcription
                    }
                }
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to start Vapi call');
        }

        return response.json();
    }
};
