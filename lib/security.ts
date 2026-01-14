/**
 * Security utilities: Rate limiting, input validation, etc.
 */

interface RateLimitStore {
    [key: string]: {
        count: number;
        resetTime: number;
    };
}

class RateLimiter {
    private store: RateLimitStore = {};
    private cleanupInterval: NodeJS.Timeout;

    constructor() {
        // Cleanup expired entries every minute
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            Object.keys(this.store).forEach(key => {
                if (this.store[key].resetTime < now) {
                    delete this.store[key];
                }
            });
        }, 60000);
    }

    check(identifier: string, maxRequests: number, windowMs: number): boolean {
        const now = Date.now();
        const entry = this.store[identifier];

        if (!entry || entry.resetTime < now) {
            // Create new window
            this.store[identifier] = {
                count: 1,
                resetTime: now + windowMs
            };
            return true;
        }

        if (entry.count >= maxRequests) {
            return false;
        }

        entry.count++;
        return true;
    }

    getRemaining(identifier: string): number {
        const entry = this.store[identifier];
        if (!entry || entry.resetTime < Date.now()) {
            return 0;
        }
        return entry.count;
    }

    destroy() {
        clearInterval(this.cleanupInterval);
    }
}

export const rateLimiter = new RateLimiter();

/**
 * Rate limit middleware
 */
export function rateLimit(maxRequests: number = 100, windowMs: number = 60000) {
    return (request: Request): { allowed: boolean; remaining: number; resetTime: number } => {
        const identifier = request.headers.get('x-forwarded-for') || 
                          request.headers.get('x-real-ip') || 
                          'unknown';
        
        const allowed = rateLimiter.check(identifier, maxRequests, windowMs);
        const entry = rateLimiter['store'][identifier];
        
        return {
            allowed,
            remaining: entry ? maxRequests - entry.count : maxRequests,
            resetTime: entry?.resetTime || Date.now() + windowMs
        };
    };
}

/**
 * Input validation and sanitization
 */
export function sanitizeInput(input: string): string {
    return input
        .trim()
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .slice(0, 10000); // Limit length
}

export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => chars[byte % chars.length]).join('');
}






