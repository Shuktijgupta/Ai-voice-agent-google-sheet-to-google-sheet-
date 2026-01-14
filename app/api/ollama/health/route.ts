import { NextResponse } from 'next/server';
import { checkOllamaHealth, testOllama, getDefaultOllamaConfig } from '@/lib/ollama';

/**
 * Comprehensive health check endpoint for Ollama
 * GET /api/ollama/health
 */
export async function GET() {
    try {
        const config = getDefaultOllamaConfig();
        const health = await checkOllamaHealth(config);
        
        // If healthy, run a quick test
        let testResult = null;
        if (health.healthy) {
            testResult = await testOllama(config);
        }

        return NextResponse.json({
            status: health.healthy ? 'operational' : 'unavailable',
            ollama: {
                url: health.url,
                healthy: health.healthy,
                error: health.error,
            },
            models: health.models.map(m => ({
                name: m.name,
                size: `${(m.size / 1024 / 1024).toFixed(2)} MB`,
                parameterSize: m.details?.parameter_size,
                quantization: m.details?.quantization_level,
                modified: m.modified,
            })),
            test: testResult ? {
                success: testResult.success,
                response: testResult.response,
                duration: testResult.duration ? `${testResult.duration}ms` : undefined,
                error: testResult.error,
            } : null,
            config: {
                model: config.model,
                temperature: config.temperature,
                timeout: config.timeout,
            },
            timestamp: new Date().toISOString(),
        }, {
            status: health.healthy ? 200 : 503,
        });
    } catch (error) {
        return NextResponse.json({
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
        }, { status: 500 });
    }
}






