import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limit store for Edge runtime
// Note: This is per-instance and will reset on server restart
// For production, consider using Redis or Vercel KV
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(
    identifier: string,
    maxRequests: number = 100,
    windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = rateLimitStore.get(identifier);

    if (!entry || entry.resetTime < now) {
        // Create new window
        rateLimitStore.set(identifier, {
            count: 1,
            resetTime: now + windowMs
        });
        return {
            allowed: true,
            remaining: maxRequests - 1,
            resetTime: now + windowMs
        };
    }

    if (entry.count >= maxRequests) {
        return {
            allowed: false,
            remaining: 0,
            resetTime: entry.resetTime
        };
    }

    entry.count++;
    rateLimitStore.set(identifier, entry);
    return {
        allowed: true,
        remaining: maxRequests - entry.count,
        resetTime: entry.resetTime
    };
}

export function middleware(request: NextRequest) {
    // Apply rate limiting to API routes
    if (request.nextUrl.pathname.startsWith('/api/')) {
        const identifier = request.headers.get('x-forwarded-for') || 
                          request.headers.get('x-real-ip') || 
                          request.ip || 
                          'unknown';
        
        const result = checkRateLimit(identifier, 100, 60000); // 100 requests per minute

        if (!result.allowed) {
            return NextResponse.json(
                { error: 'Rate limit exceeded', retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000) },
                {
                    status: 429,
                    headers: {
                        'X-RateLimit-Limit': '100',
                        'X-RateLimit-Remaining': result.remaining.toString(),
                        'X-RateLimit-Reset': result.resetTime.toString(),
                        'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
                    }
                }
            );
        }

        // Add rate limit headers to response
        const response = NextResponse.next();
        response.headers.set('X-RateLimit-Limit', '100');
        response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
        response.headers.set('X-RateLimit-Reset', result.resetTime.toString());
        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/api/:path*'
};
