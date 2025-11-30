import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth';

export async function middleware(request: NextRequest) {
    const session = request.cookies.get('session')?.value;

    // Decrypt the session to verify it
    let isAuthenticated = false;
    if (session) {
        try {
            await decrypt(session);
            isAuthenticated = true;
        } catch (error) {
            // Invalid session
        }
    }

    // Protect Dashboard Route
    if (request.nextUrl.pathname === '/' && !isAuthenticated) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Redirect authenticated users away from login/signup
    if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup') && isAuthenticated) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/', '/login', '/signup'],
};
