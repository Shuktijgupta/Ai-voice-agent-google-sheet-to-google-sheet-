import { NextResponse } from 'next/server';
import { generateWithOllama, generateStreamWithOllama, getDefaultOllamaConfig } from '@/lib/ollama';

/**
 * Generate text using Ollama
 * POST /api/ollama/generate
 * 
 * Body: {
 *   prompt: string;
 *   stream?: boolean;
 *   model?: string;
 *   temperature?: number;
 * }
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { prompt, stream, model, temperature } = body;

        if (!prompt || typeof prompt !== 'string') {
            return NextResponse.json(
                { error: 'Prompt is required and must be a string' },
                { status: 400 }
            );
        }

        const config = getDefaultOllamaConfig();
        if (model) config.model = model;
        if (temperature !== undefined) config.temperature = temperature;

        // Handle streaming
        if (stream) {
            const stream = new ReadableStream({
                async start(controller) {
                    try {
                        for await (const chunk of generateStreamWithOllama(prompt, config)) {
                            const data = `data: ${JSON.stringify({ chunk })}\n\n`;
                            controller.enqueue(new TextEncoder().encode(data));
                        }
                        controller.close();
                    } catch (error) {
                        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                        controller.error(new Error(errorMsg));
                    }
                },
            });

            return new Response(stream, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            });
        }

        // Non-streaming response
        const result = await generateWithOllama(prompt, config);

        return NextResponse.json({
            success: true,
            response: result.response,
            model: result.model,
            metrics: {
                totalDuration: result.totalDuration ? `${(result.totalDuration / 1e9).toFixed(2)}s` : undefined,
                loadDuration: result.loadDuration ? `${(result.loadDuration / 1e9).toFixed(2)}s` : undefined,
                evalDuration: result.evalDuration ? `${(result.evalDuration / 1e9).toFixed(2)}s` : undefined,
                tokensGenerated: result.evalCount,
                tokensPerSecond: result.evalCount && result.evalDuration
                    ? (result.evalCount / (result.evalDuration / 1e9)).toFixed(1)
                    : undefined,
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Ollama generation error:', message);
        
        return NextResponse.json(
            { 
                success: false,
                error: message,
            },
            { status: 500 }
        );
    }
}






