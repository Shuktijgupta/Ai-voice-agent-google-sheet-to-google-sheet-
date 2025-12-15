import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth';

// Routes that don't require authentication
const publicRoutes = ['/login', '/signup'];
// API routes that don't require authentication
const publicApiRoutes = ['/api/auth/login', '/api/auth/signup', '/api/bland/webhook', '/api/vapi/webhook'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    
    // Skip public API routes
    if (publicApiRoutes.some(route => pathname.startsWith(route))) {
        return NextResponse.next();
    }

    const session = request.cookies.get('session')?.value;

    // Decrypt the session to verify it
    let isAuthenticated = false;
    if (session) {
        try {
            await decrypt(session);
            isAuthenticated = true;
        } catch {
            // Invalid session - clear the cookie
            const response = NextResponse.redirect(new URL('/login', request.url));
            response.cookies.set('session', '', { expires: new Date(0) });
            return response;
        }
    }

    // Redirect authenticated users away from login/signup
    if (publicRoutes.includes(pathname) && isAuthenticated) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // Protect all other routes
    if (!publicRoutes.includes(pathname) && !isAuthenticated) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/bland/webhook|api/vapi/webhook).*)',
    ],
};
