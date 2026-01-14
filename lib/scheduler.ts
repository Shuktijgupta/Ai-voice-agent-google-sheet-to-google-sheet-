/**
 * Call Scheduler - Processes scheduled calls and executes them
 */

import { prisma } from './prisma';

export interface SchedulerConfig {
    checkInterval: number; // milliseconds
    batchSize: number;
    timezone: string;
}

const defaultConfig: SchedulerConfig = {
    checkInterval: 60000, // 1 minute
    batchSize: 10,
    timezone: 'UTC'
};

/**
 * Process scheduled calls that are due
 */
export async function processScheduledCalls() {
    const now = new Date();
    
    // Find calls that are due and pending
    const dueCalls = await prisma.scheduledCall.findMany({
        where: {
            status: 'pending',
            scheduledAt: { lte: now }
        },
        include: {
            driver: true,
            agent: true
        },
        take: defaultConfig.batchSize,
        orderBy: { scheduledAt: 'asc' }
    });

    for (const scheduledCall of dueCalls) {
        try {
            // Mark as queued
            await prisma.scheduledCall.update({
                where: { id: scheduledCall.id },
                data: { status: 'queued' }
            });

            // Initiate the call
            const callResponse = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai-call/start`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        driverId: scheduledCall.driverId,
                        agentId: scheduledCall.agentId
                    })
                }
            );

            if (callResponse.ok) {
                const callData = await callResponse.json();
                
                // Update scheduled call with call reference
                await prisma.scheduledCall.update({
                    where: { id: scheduledCall.id },
                    data: {
                        status: 'completed',
                        callId: callData.callId
                    }
                });

                // Handle recurring calls
                if (scheduledCall.recurring) {
                    await scheduleNextRecurringCall(scheduledCall);
                }
            } else {
                // Retry logic
                const retryCount = scheduledCall.retryCount + 1;
                if (retryCount < scheduledCall.maxRetries) {
                    // Reschedule for retry (exponential backoff)
                    const retryDelay = Math.min(60000 * Math.pow(2, retryCount), 3600000); // Max 1 hour
                    await prisma.scheduledCall.update({
                        where: { id: scheduledCall.id },
                        data: {
                            status: 'pending',
                            retryCount: retryCount,
                            scheduledAt: new Date(now.getTime() + retryDelay)
                        }
                    });
                } else {
                    // Max retries reached
                    await prisma.scheduledCall.update({
                        where: { id: scheduledCall.id },
                        data: { status: 'failed' }
                    });
                }
            }
        } catch (error) {
            console.error(`Error processing scheduled call ${scheduledCall.id}:`, error);
            
            // Retry logic
            const retryCount = scheduledCall.retryCount + 1;
            if (retryCount < scheduledCall.maxRetries) {
                const retryDelay = Math.min(60000 * Math.pow(2, retryCount), 3600000);
                await prisma.scheduledCall.update({
                    where: { id: scheduledCall.id },
                    data: {
                        status: 'pending',
                        retryCount: retryCount,
                        scheduledAt: new Date(now.getTime() + retryDelay)
                    }
                });
            } else {
                await prisma.scheduledCall.update({
                    where: { id: scheduledCall.id },
                    data: { status: 'failed' }
                });
            }
        }
    }

    return { processed: dueCalls.length };
}

/**
 * Schedule next occurrence for recurring calls
 */
async function scheduleNextRecurringCall(scheduledCall: any) {
    const lastScheduled = new Date(scheduledCall.scheduledAt);
    let nextScheduled: Date;

    switch (scheduledCall.recurring) {
        case 'daily':
            nextScheduled = new Date(lastScheduled);
            nextScheduled.setDate(nextScheduled.getDate() + 1);
            break;
        case 'weekly':
            nextScheduled = new Date(lastScheduled);
            nextScheduled.setDate(nextScheduled.getDate() + 7);
            break;
        case 'monthly':
            nextScheduled = new Date(lastScheduled);
            nextScheduled.setMonth(nextScheduled.getMonth() + 1);
            break;
        default:
            return; // No recurring
    }

    await prisma.scheduledCall.create({
        data: {
            driverId: scheduledCall.driverId,
            agentId: scheduledCall.agentId,
            scheduledAt: nextScheduled,
            timezone: scheduledCall.timezone,
            recurring: scheduledCall.recurring,
            maxRetries: scheduledCall.maxRetries,
            status: 'pending'
        }
    });
}

/**
 * Start scheduler (call this from a cron job or background worker)
 */
export function startScheduler(config: Partial<SchedulerConfig> = {}) {
    const finalConfig = { ...defaultConfig, ...config };
    
    // Process immediately
    processScheduledCalls();
    
    // Then set up interval
    const interval = setInterval(() => {
        processScheduledCalls().catch(console.error);
    }, finalConfig.checkInterval);

    return () => clearInterval(interval);
}






