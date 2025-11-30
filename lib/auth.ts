import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secretKey = "secret-key-change-me-in-prod"; // In a real app, use process.env.JWT_SECRET
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(key);
}

export async function decrypt(input: string): Promise<any> {
    const { payload } = await jwtVerify(input, key, {
        algorithms: ['HS256'],
    });
    return payload;
}

export async function getSession() {
    const session = (await cookies()).get('session')?.value;
    if (!session) return null;
    try {
        return await decrypt(session);
    } catch (error) {
        return null;
    }
}

export async function login(userData: any) {
    // Create the session
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const session = await encrypt({ user: userData, expires });

    // Save the session in a cookie
    (await cookies()).set('session', session, { expires, httpOnly: true });
}

export async function logout() {
    // Destroy the session
    (await cookies()).set('session', '', { expires: new Date(0) });
}
