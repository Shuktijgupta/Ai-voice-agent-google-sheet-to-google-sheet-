import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Valid AI caller providers
const VALID_PROVIDERS = ['bland', 'elevenlabs'] as const;
type AIProvider = typeof VALID_PROVIDERS[number];

/**
 * GET - Retrieve all settings or specific setting
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const key = searchParams.get('key');

        if (key) {
            // Get specific setting
            const setting = await prisma.settings.findUnique({
                where: { key },
            });
            return NextResponse.json({ 
                key, 
                value: setting?.value || getDefaultValue(key) 
            });
        }

        // Get all settings
        const settings = await prisma.settings.findMany();
        
        // Convert to key-value object with defaults
        const settingsObj: Record<string, string> = {
            aiCallerProvider: 'bland', // Default
        };
        
        settings.forEach(s => {
            settingsObj[s.key] = s.value;
        });

        return NextResponse.json(settingsObj);

    } catch (error) {
        console.error('Settings GET error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST - Update a setting
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { key, value } = body;

        if (!key || value === undefined) {
            return NextResponse.json(
                { error: 'Key and value are required' },
                { status: 400 }
            );
        }

        // Validate AI provider setting
        if (key === 'aiCallerProvider' && !VALID_PROVIDERS.includes(value)) {
            return NextResponse.json(
                { error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` },
                { status: 400 }
            );
        }

        // Upsert the setting
        const setting = await prisma.settings.upsert({
            where: { key },
            update: { value },
            create: { 
                id: key, // Use key as ID for simplicity
                key, 
                value 
            },
        });

        return NextResponse.json({
            success: true,
            key: setting.key,
            value: setting.value,
        });

    } catch (error) {
        console.error('Settings POST error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Get default value for a setting key
 */
function getDefaultValue(key: string): string {
    const defaults: Record<string, string> = {
        aiCallerProvider: 'bland',
    };
    return defaults[key] || '';
}
