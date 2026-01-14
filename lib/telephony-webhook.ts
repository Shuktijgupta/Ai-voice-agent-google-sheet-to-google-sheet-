/**
 * Telephony Webhook Utilities
 * Handles different webhook formats from various Indian telephony providers
 */

export interface WebhookData {
    callId: string;
    status: string;
    speechResult?: string;
    digits?: string;
    recordingUrl?: string;
    duration?: string;
    from?: string;
    to?: string;
    provider: string;
}

/**
 * Parse webhook data from different providers
 */
export function parseWebhookData(request: Request, provider: string): Promise<WebhookData> {
    return new Promise(async (resolve) => {
        const contentType = request.headers.get('content-type') || '';
        let data: any = {};

        if (contentType.includes('application/json')) {
            data = await request.json();
        } else {
            const formData = await request.formData();
            data = Object.fromEntries(formData.entries());
        }

        // Normalize based on provider
        let callId = '';
        let status = '';
        let speechResult = '';
        let digits = '';
        let recordingUrl = '';
        let duration = '';
        let from = '';
        let to = '';

        switch (provider) {
            case 'exotel':
                callId = data.CallSid || data.call_id || data.Sid;
                status = data.CallStatus || data.status || data.CallState;
                speechResult = data.SpeechResult || data.speech_result || data.transcription;
                digits = data.Digits || data.dtmf;
                recordingUrl = data.RecordingUrl || data.recording_url;
                duration = data.RecordingDuration || data.duration;
                from = data.From || data.from || data.caller_id;
                to = data.To || data.to || data.called_number;
                break;

            case 'knowlarity':
                callId = data.call_id || data.id || data.call_uuid;
                status = data.status || data.call_status || data.state;
                speechResult = data.speech_result || data.transcription || data.user_input;
                digits = data.dtmf || data.digits;
                recordingUrl = data.recording_url || data.recording || data.media_url;
                duration = data.duration || data.call_duration;
                from = data.from || data.caller_id || data.source;
                to = data.to || data.called_number || data.destination;
                break;

            case 'ozonetel':
                callId = data.call_id || data.id || data.call_uuid;
                status = data.status || data.call_status;
                speechResult = data.speech_result || data.transcription;
                digits = data.dtmf;
                recordingUrl = data.recording_url;
                duration = data.duration;
                from = data.from || data.caller;
                to = data.to || data.called;
                break;

            case 'plivo':
                callId = data.CallUUID || data.CallSid || data.call_uuid;
                status = data.CallStatus || data.CallState || data.status;
                speechResult = data.SpeechResult || data.speech_result;
                digits = data.Digits || data.DTMF;
                recordingUrl = data.RecordingUrl || data.recording_url;
                duration = data.RecordingDuration || data.duration;
                from = data.From || data.from;
                to = data.To || data.to;
                break;

            case 'tata':
                // Tata SmartFlo webhook format
                callId = data.call_id || data.id || data.call_uuid || data.callSid;
                status = data.call_status || data.status || data.state || data.event_type;
                speechResult = data.speech_result || data.transcription || data.user_input || data.text;
                digits = data.dtmf || data.digits || data.input;
                recordingUrl = data.recording_url || data.recording || data.media_url;
                duration = data.duration || data.call_duration || data.total_duration;
                from = data.from || data.caller_id || data.agent_number || data.source;
                to = data.to || data.destination_number || data.called_number || data.destination;
                break;

            default:
                // Generic parsing
                callId = data.CallSid || data.call_id || data.CallUUID || data.id || data.callSid;
                status = data.CallStatus || data.status || data.CallState || data.state;
                speechResult = data.SpeechResult || data.speech_result || data.transcription || data.text;
                digits = data.Digits || data.dtmf || data.digits;
                recordingUrl = data.RecordingUrl || data.recording_url || data.recording;
                duration = data.RecordingDuration || data.duration || data.call_duration;
                from = data.From || data.from || data.caller_id || data.caller;
                to = data.To || data.to || data.called_number;
        }

        resolve({
            callId,
            status,
            speechResult,
            digits,
            recordingUrl,
            duration,
            from,
            to,
            provider,
        });
    });
}

/**
 * Generate response format for different providers
 */
export function generateProviderResponse(
    provider: string,
    text: string,
    webhookUrl: string,
    options: {
        gather?: boolean;
        language?: string;
        voice?: string;
    } = {}
): Response {
    const { gather = true, language = 'hi-IN', voice = 'alice' } = options;

    switch (provider) {
        case 'exotel':
        case 'plivo':
            // XML/TwiML format
            if (gather) {
                const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say language="${language}" voice="${voice}">${text}</Say>
    <Gather input="speech" action="${webhookUrl}" method="POST" language="${language}" speechTimeout="5" enhanced="true">
        <Say language="${language}" voice="${voice}">कृपया जवाब दें।</Say>
    </Gather>
    <Say language="${language}" voice="${voice}">धन्यवाद। अलविदा।</Say>
    <Hangup/>
</Response>`;
                return new Response(xml, {
                    headers: { 'Content-Type': 'text/xml' },
                });
            } else {
                const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say language="${language}" voice="${voice}">${text}</Say>
    <Hangup/>
</Response>`;
                return new Response(xml, {
                    headers: { 'Content-Type': 'text/xml' },
                });
            }

        case 'knowlarity':
        case 'ozonetel':
        case 'tata':
            // JSON format (Tata SmartFlo uses JSON responses)
            if (gather) {
                return new Response(JSON.stringify({
                    action: 'speak',
                    text: text,
                    language: language,
                    voice: voice,
                    next_action: {
                        type: 'gather',
                        input: 'speech',
                        webhook: webhookUrl,
                        timeout: 5,
                    },
                }), {
                    headers: { 'Content-Type': 'application/json' },
                });
            } else {
                return new Response(JSON.stringify({
                    action: 'speak',
                    text: text,
                    language: language,
                    voice: voice,
                    action: 'hangup',
                }), {
                    headers: { 'Content-Type': 'application/json' },
                });
            }

        default:
            // Default to XML
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say language="${language}" voice="${voice}">${text}</Say>
    ${gather ? `<Gather input="speech" action="${webhookUrl}" method="POST" language="${language}" speechTimeout="5">
        <Say language="${language}" voice="${voice}">कृपया जवाब दें।</Say>
    </Gather>` : ''}
    <Hangup/>
</Response>`;
            return new Response(xml, {
                headers: { 'Content-Type': 'text/xml' },
            });
    }
}




