import { NextResponse } from 'next/server';
import { processScheduledCalls } from '@/lib/scheduler';

/**
 * Process scheduled calls (called by cron job)
 * POST /api/scheduler/process
 */
export async function POST(request: Request) {
    try {
        // Optional: Add authentication/authorization here
        const authHeader = request.headers.get('authorization');
        const expectedToken = process.env.SCHEDULER_SECRET;
        
        if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const result = await processScheduledCalls();
        
        return NextResponse.json({
            success: true,
            processed: result.processed,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Scheduler error:', error);
        return NextResponse.json(
            { error: 'Failed to process scheduled calls' },
            { status: 500 }
        );
    }
}






