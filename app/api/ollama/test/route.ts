import { NextResponse } from 'next/server';

/**
 * Test Ollama Connection
 * Checks if Ollama is running locally and can generate responses
 */
export async function GET() {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    
    try {
        // Check if Ollama is running
        const tagsResponse = await fetch(`${ollamaUrl}/api/tags`, {
            method: 'GET',
        });
        
        if (!tagsResponse.ok) {
            return NextResponse.json({
                status: 'error',
                message: 'Ollama is not responding. Make sure Ollama is installed and running.',
                help: 'Run: ollama serve',
            }, { status: 503 });
        }
        
        const tagsData = await tagsResponse.json();
        const models = tagsData.models || [];
        
        if (models.length === 0) {
            return NextResponse.json({
                status: 'warning',
                message: 'Ollama is running but no models are installed.',
                help: 'Run: ollama pull llama3.2',
                ollamaUrl,
            });
        }
        
        return NextResponse.json({
            status: 'ok',
            message: 'Ollama is running and ready!',
            ollamaUrl,
            models: models.map((m: any) => ({
                name: m.name,
                size: formatBytes(m.size),
                modified: m.modified_at,
            })),
            recommendedModel: models.find((m: any) => 
                m.name.includes('llama') || m.name.includes('phi')
            )?.name || models[0]?.name,
        });
        
    } catch (error) {
        return NextResponse.json({
            status: 'error',
            message: 'Cannot connect to Ollama',
            error: error instanceof Error ? error.message : 'Unknown error',
            help: [
                '1. Install Ollama from https://ollama.com',
                '2. Run: ollama serve',
                '3. Pull a model: ollama pull llama3.2',
            ],
        }, { status: 503 });
    }
}

/**
 * Test Ollama Generation
 */
export async function POST(request: Request) {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    
    try {
        const { prompt, model } = await request.json();
        
        const response = await fetch(`${ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model || 'llama3.2',
                prompt: prompt || 'Say "Hello, I am working!" in Hindi',
                stream: false,
            }),
        });
        
        if (!response.ok) {
            const error = await response.text();
            return NextResponse.json({
                status: 'error',
                message: 'Failed to generate response',
                error,
            }, { status: response.status });
        }
        
        const data = await response.json();
        
        return NextResponse.json({
            status: 'ok',
            model: data.model,
            response: data.response,
            totalDuration: `${(data.total_duration / 1e9).toFixed(2)}s`,
            tokensPerSecond: data.eval_count && data.eval_duration 
                ? (data.eval_count / (data.eval_duration / 1e9)).toFixed(1)
                : 'N/A',
        });
        
    } catch (error) {
        return NextResponse.json({
            status: 'error',
            message: 'Failed to connect to Ollama',
            error: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
