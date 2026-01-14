/**
 * Enhanced Error Handling with Retry Logic and Provider Failover
 */

export interface RetryConfig {
    maxRetries: number;
    initialDelay: number; // milliseconds
    maxDelay: number; // milliseconds
    backoffMultiplier: number;
    retryableErrors: string[];
}

const defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 60000,
    backoffMultiplier: 2,
    retryableErrors: [
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        'ECONNREFUSED',
        'timeout',
        'network',
        'rate limit',
        '503',
        '502',
        '500'
    ]
};

export class RetryableError extends Error {
    constructor(
        message: string,
        public retryable: boolean = true,
        public originalError?: Error
    ) {
        super(message);
        this.name = 'RetryableError';
    }
}

export class NonRetryableError extends Error {
    constructor(message: string, public originalError?: Error) {
        super(message);
        this.name = 'NonRetryableError';
    }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: Error, config: Partial<RetryConfig> = {}): boolean {
    const finalConfig = { ...defaultRetryConfig, ...config };
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();
    
    return finalConfig.retryableErrors.some(pattern => 
        errorMessage.includes(pattern.toLowerCase()) || 
        errorName.includes(pattern.toLowerCase())
    );
}

/**
 * Calculate delay for retry (exponential backoff)
 */
export function calculateRetryDelay(attempt: number, config: Partial<RetryConfig> = {}): number {
    const finalConfig = { ...defaultRetryConfig, ...config };
    const delay = finalConfig.initialDelay * Math.pow(finalConfig.backoffMultiplier, attempt - 1);
    return Math.min(delay, finalConfig.maxDelay);
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
    const finalConfig = { ...defaultRetryConfig, ...config };
    let lastError: Error;

    for (let attempt = 1; attempt <= finalConfig.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            
            // Check if error is retryable
            if (!isRetryableError(lastError, finalConfig)) {
                throw new NonRetryableError(lastError.message, lastError);
            }

            // If this is the last attempt, throw
            if (attempt === finalConfig.maxRetries) {
                throw new RetryableError(
                    `Failed after ${finalConfig.maxRetries} attempts: ${lastError.message}`,
                    true,
                    lastError
                );
            }

            // Calculate delay and wait
            const delay = calculateRetryDelay(attempt, finalConfig);
            if (onRetry) {
                onRetry(attempt, lastError);
            }
            
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError!;
}

/**
 * Provider failover - try multiple providers in sequence
 */
export async function withProviderFailover<T>(
    providers: Array<{
        name: string;
        fn: () => Promise<T>;
    }>,
    onProviderSwitch?: (from: string, to: string, error: Error) => void
): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i < providers.length; i++) {
        const provider = providers[i];
        
        try {
            return await provider.fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            
            // If this is the last provider, throw
            if (i === providers.length - 1) {
                throw new Error(
                    `All providers failed. Last error: ${lastError.message}`
                );
            }

            // Try next provider
            const nextProvider = providers[i + 1];
            if (onProviderSwitch) {
                onProviderSwitch(provider.name, nextProvider.name, lastError);
            }
        }
    }

    throw lastError || new Error('No providers available');
}

/**
 * Error categorization
 */
export enum ErrorCategory {
    NETWORK = 'network',
    AUTHENTICATION = 'authentication',
    RATE_LIMIT = 'rate_limit',
    VALIDATION = 'validation',
    PROVIDER = 'provider',
    UNKNOWN = 'unknown'
}

export function categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
        return ErrorCategory.NETWORK;
    }
    if (message.includes('auth') || message.includes('unauthorized') || message.includes('401') || message.includes('403')) {
        return ErrorCategory.AUTHENTICATION;
    }
    if (message.includes('rate limit') || message.includes('429') || message.includes('too many')) {
        return ErrorCategory.RATE_LIMIT;
    }
    if (message.includes('validation') || message.includes('invalid') || message.includes('400')) {
        return ErrorCategory.VALIDATION;
    }
    if (message.includes('provider') || message.includes('service unavailable') || message.includes('503')) {
        return ErrorCategory.PROVIDER;
    }

    return ErrorCategory.UNKNOWN;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyError(error: Error): string {
    const category = categorizeError(error);

    switch (category) {
        case ErrorCategory.NETWORK:
            return 'Network connection issue. Please check your internet connection and try again.';
        case ErrorCategory.AUTHENTICATION:
            return 'Authentication failed. Please check your API credentials.';
        case ErrorCategory.RATE_LIMIT:
            return 'Rate limit exceeded. Please wait a moment and try again.';
        case ErrorCategory.VALIDATION:
            return 'Invalid input. Please check your data and try again.';
        case ErrorCategory.PROVIDER:
            return 'Service temporarily unavailable. Please try again later.';
        default:
            return error.message || 'An unexpected error occurred.';
    }
}

/**
 * Get error recovery suggestions
 */
export function getErrorRecoverySuggestions(error: Error): string[] {
    const category = categorizeError(error);
    const suggestions: string[] = [];

    switch (category) {
        case ErrorCategory.NETWORK:
            suggestions.push('Check your internet connection');
            suggestions.push('Verify the service is accessible');
            suggestions.push('Try again in a few moments');
            break;
        case ErrorCategory.AUTHENTICATION:
            suggestions.push('Verify your API keys are correct');
            suggestions.push('Check if your account has sufficient permissions');
            suggestions.push('Ensure your credentials haven\'t expired');
            break;
        case ErrorCategory.RATE_LIMIT:
            suggestions.push('Wait a few minutes before retrying');
            suggestions.push('Consider upgrading your plan for higher limits');
            suggestions.push('Implement request throttling');
            break;
        case ErrorCategory.VALIDATION:
            suggestions.push('Review the input data format');
            suggestions.push('Check required fields are provided');
            suggestions.push('Verify data types match expected format');
            break;
        case ErrorCategory.PROVIDER:
            suggestions.push('Try again in a few minutes');
            suggestions.push('Check provider status page');
            suggestions.push('Contact support if issue persists');
            break;
        default:
            suggestions.push('Check the error logs for details');
            suggestions.push('Try again later');
            suggestions.push('Contact support if the issue persists');
    }

    return suggestions;
}






