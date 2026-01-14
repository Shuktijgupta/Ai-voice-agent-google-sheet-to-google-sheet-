/**
 * Ollama Local LLM Integration
 * Direct integration with Ollama for industrial-grade local AI
 */

export interface OllamaConfig {
    url: string;
    model: string;
    temperature?: number;
    timeout?: number;
}

export interface OllamaResponse {
    response: string;
    model: string;
    done: boolean;
    totalDuration?: number;
    loadDuration?: number;
    promptEvalCount?: number;
    evalCount?: number;
    evalDuration?: number;
}

export interface OllamaModel {
    name: string;
    size: number;
    modified: string;
    details?: {
        parameter_size?: string;
        quantization_level?: string;
    };
}

/**
 * Default Ollama configuration
 */
export function getDefaultOllamaConfig(): OllamaConfig {
    return {
        url: process.env.OLLAMA_URL || 'http://localhost:11434',
        model: process.env.OLLAMA_MODEL || 'llama3.2:3b',
        temperature: parseFloat(process.env.OLLAMA_TEMPERATURE || '0.7'),
        timeout: parseInt(process.env.OLLAMA_TIMEOUT || '30000', 10),
    };
}

/**
 * Check if Ollama is running and accessible
 */
export async function checkOllamaHealth(config?: OllamaConfig): Promise<{
    healthy: boolean;
    url: string;
    models: OllamaModel[];
    error?: string;
}> {
    const cfg = config || getDefaultOllamaConfig();
    
    try {
        const response = await fetch(`${cfg.url}/api/tags`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
            return {
                healthy: false,
                url: cfg.url,
                models: [],
                error: `Ollama returned status ${response.status}`,
            };
        }

        const data = await response.json();
        const models = (data.models || []).map((m: any) => ({
            name: m.name,
            size: m.size,
            modified: m.modified_at,
            details: m.details,
        }));

        return {
            healthy: true,
            url: cfg.url,
            models,
        };
    } catch (error) {
        return {
            healthy: false,
            url: cfg.url,
            models: [],
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Generate text using Ollama
 */
export async function generateWithOllama(
    prompt: string,
    config?: OllamaConfig
): Promise<OllamaResponse> {
    const cfg = config || getDefaultOllamaConfig();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), cfg.timeout);

    try {
        const response = await fetch(`${cfg.url}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: cfg.model,
                prompt,
                stream: false,
                options: {
                    temperature: cfg.temperature,
                },
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        return {
            response: data.response || '',
            model: data.model || cfg.model,
            done: data.done !== false,
            totalDuration: data.total_duration,
            loadDuration: data.load_duration,
            promptEvalCount: data.prompt_eval_count,
            evalCount: data.eval_count,
            evalDuration: data.eval_duration,
        };
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Ollama request timed out after ${cfg.timeout}ms`);
        }
        
        throw error;
    }
}

/**
 * Generate streaming response (for real-time applications)
 */
export async function* generateStreamWithOllama(
    prompt: string,
    config?: OllamaConfig
): AsyncGenerator<string, void, unknown> {
    const cfg = config || getDefaultOllamaConfig();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), cfg.timeout || 60000);

    try {
        const response = await fetch(`${cfg.url}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: cfg.model,
                prompt,
                stream: true,
                options: {
                    temperature: cfg.temperature,
                },
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('No response body reader available');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const data = JSON.parse(line);
                        if (data.response) {
                            yield data.response;
                        }
                        if (data.done) {
                            return;
                        }
                    } catch {
                        // Skip invalid JSON lines
                    }
                }
            }
        }
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Ollama request timed out after ${cfg.timeout}ms`);
        }
        
        throw error;
    }
}

/**
 * Get model information
 */
export async function getOllamaModelInfo(
    modelName: string,
    config?: OllamaConfig
): Promise<OllamaModel | null> {
    const cfg = config || getDefaultOllamaConfig();
    const health = await checkOllamaHealth(cfg);
    
    return health.models.find(m => m.name === modelName) || null;
}

/**
 * Test Ollama with a simple prompt
 */
export async function testOllama(config?: OllamaConfig): Promise<{
    success: boolean;
    response?: string;
    duration?: number;
    error?: string;
}> {
    try {
        const startTime = Date.now();
        const result = await generateWithOllama(
            'Say "Hello, I am working!" in Hindi. Keep it brief.',
            config
        );
        const duration = Date.now() - startTime;

        return {
            success: true,
            response: result.response,
            duration,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

