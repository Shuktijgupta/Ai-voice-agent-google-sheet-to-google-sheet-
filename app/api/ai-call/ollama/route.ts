import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateWithOllama, getDefaultOllamaConfig, checkOllamaHealth } from '@/lib/ollama';
import { TRUCK_DRIVER_AGENT_CONFIG } from '@/lib/ai-agent-config';

/**
 * Start an AI call using local Ollama (Text Generation Only)
 * POST /api/ai-call/ollama
 * 
 * ⚠️ NOTE: This endpoint only generates text using Ollama. It does NOT make actual phone calls.
 * For actual phone calls, you need a telephony provider (Bland AI, Exotel, Knowlarity, Ozonetel, Plivo, etc.).
 * 
 * Use /api/ai-call/ollama-with-telephony for actual phone calls with Ollama + telephony provider.
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

        const body = await request.json();
        const { driverId, agentId, prompt } = body;

        if (!driverId && !prompt) {
            return NextResponse.json(
                { error: 'Either driverId or prompt is required' },
                { status: 400 }
            );
        }

        let systemPrompt = '';
        let driverName = 'Driver';

        // Fetch driver if driverId provided
        if (driverId) {
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

            driverName = driver.name;

            // Build prompt from agent or use default
            if (agentId) {
                const agent = await prisma.agent.findUnique({
                    where: { id: agentId },
                    select: { systemPrompt: true, questions: true }
                });

                if (agent) {
                    const agentQuestions = JSON.parse(agent.questions);
                    systemPrompt = `
${agent.systemPrompt}

You are calling ${driverName}.

Ask these questions one by one:
${agentQuestions.map((q: { text: string }) => `- ${q.text}`).join('\n')}
                    `.trim();
                }
            }

            // Fallback to default config
            if (!systemPrompt) {
                systemPrompt = `
${TRUCK_DRIVER_AGENT_CONFIG.systemPrompt}

You are calling ${driverName}. Conduct a brief status update call in Hindi.
Ask about: current location, reason for haltage, and estimated time to resume.
                `.trim();
            }
        } else {
            // Use provided prompt directly
            systemPrompt = prompt || 'You are a helpful AI assistant.';
        }

        // Generate response using Ollama
        const config = getDefaultOllamaConfig();
        const startTime = Date.now();
        
        const result = await generateWithOllama(systemPrompt, config);
        
        const duration = Date.now() - startTime;

        // Save call record if driverId provided
        let call = null;
        if (driverId) {
            call = await prisma.call.create({
                data: {
                    driverId,
                    agentId: agentId || null,
                    provider: 'ollama',
                    status: 'completed',
                    transcript: result.response,
                    durationSeconds: Math.floor(duration / 1000),
                },
            });

            // Update driver status
            await prisma.driver.update({
                where: { id: driverId },
                data: { status: 'contacted' },
            });
        }

        return NextResponse.json({
            success: true,
            callId: call?.id,
            response: result.response,
            model: result.model,
            provider: 'ollama',
            local: true,
            warning: 'This is text generation only. No actual phone call was made. Use a telephony provider for real calls.',
            metrics: {
                duration: `${duration}ms`,
                totalDuration: result.totalDuration ? `${(result.totalDuration / 1e9).toFixed(2)}s` : undefined,
                tokensGenerated: result.evalCount,
                tokensPerSecond: result.evalCount && result.evalDuration
                    ? (result.evalCount / (result.evalDuration / 1e9)).toFixed(1)
                    : undefined,
            },
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('Ollama AI Call Error:', message);
        
        return NextResponse.json(
            { 
                success: false,
                error: message,
            },
            { status: 500 }
        );
    }
}

/**
 * Get Ollama status and configuration
 * GET /api/ai-call/ollama
 */
export async function GET() {
    try {
        const health = await checkOllamaHealth();
        const config = getDefaultOllamaConfig();

        return NextResponse.json({
            available: health.healthy,
            ollama: {
                url: health.url,
                healthy: health.healthy,
                error: health.error,
            },
            models: health.models.map(m => ({
                name: m.name,
                size: `${(m.size / 1024 / 1024).toFixed(2)} MB`,
                parameterSize: m.details?.parameter_size,
            })),
            config: {
                model: config.model,
                temperature: config.temperature,
                timeout: config.timeout,
            },
            status: health.healthy ? 'ready' : 'unavailable',
        });
    } catch (error) {
        return NextResponse.json({
            available: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}

