/**
 * Cost Tracking and Optimization
 */

import { prisma } from './prisma';

export interface CostConfig {
    provider: string;
    costPerMinute: number;
    costPerCall: number;
    currency: string;
}

// Default cost configurations (in USD)
const DEFAULT_COSTS: Record<string, CostConfig> = {
    'bland': {
        provider: 'bland',
        costPerMinute: 0.15,
        costPerCall: 0.05,
        currency: 'USD'
    },
    'exotel': {
        provider: 'exotel',
        costPerMinute: 0.02,
        costPerCall: 0.01,
        currency: 'INR'
    },
    'knowlarity': {
        provider: 'knowlarity',
        costPerMinute: 0.025,
        costPerCall: 0.01,
        currency: 'INR'
    },
    'ozonetel': {
        provider: 'ozonetel',
        costPerMinute: 0.02,
        costPerCall: 0.01,
        currency: 'INR'
    },
    'plivo': {
        provider: 'plivo',
        costPerMinute: 0.015,
        costPerCall: 0.005,
        currency: 'USD'
    },
    'self-hosted': {
        provider: 'self-hosted',
        costPerMinute: 0.01, // Just telephony cost
        costPerCall: 0.005,
        currency: 'USD'
    }
};

/**
 * Calculate cost for a call
 */
export function calculateCallCost(
    provider: string,
    durationSeconds: number,
    customConfig?: Partial<CostConfig>
): number {
    const config = customConfig || DEFAULT_COSTS[provider] || DEFAULT_COSTS['bland'];
    const durationMinutes = durationSeconds / 60;
    return config.costPerCall + (durationMinutes * config.costPerMinute);
}

/**
 * Record cost for a call
 */
export async function recordCallCost(
    callId: string,
    provider: string,
    durationSeconds: number | null,
    customConfig?: Partial<CostConfig>
): Promise<void> {
    const cost = calculateCallCost(provider, durationSeconds || 0, customConfig);
    const config = customConfig || DEFAULT_COSTS[provider] || DEFAULT_COSTS['bland'];

    try {
        // Update call record
        await prisma.call.update({
            where: { id: callId },
            data: {
                cost,
                costCurrency: config.currency
            }
        });

        // Create cost record
        await prisma.costRecord.upsert({
            where: { callId },
            create: {
                callId,
                provider,
                cost,
                currency: config.currency,
                duration: durationSeconds,
                metadata: JSON.stringify({ config })
            },
            update: {
                cost,
                duration: durationSeconds,
                metadata: JSON.stringify({ config })
            }
        });
    } catch (error) {
        console.error('Failed to record call cost:', error);
    }
}

/**
 * Get cost statistics
 */
export async function getCostStats(period: 'day' | 'week' | 'month' | 'all' = 'month') {
    const now = new Date();
    let startDate: Date;

    switch (period) {
        case 'day':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
        case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        default:
            startDate = new Date(0);
    }

    const costRecords = await prisma.costRecord.findMany({
        where: {
            createdAt: { gte: startDate }
        },
        include: {
            call: {
                select: {
                    status: true,
                    durationSeconds: true
                }
            }
        }
    });

    const totalCost = costRecords.reduce((sum, record) => sum + record.cost, 0);
    const byProvider: Record<string, { cost: number; count: number }> = {};

    costRecords.forEach(record => {
        if (!byProvider[record.provider]) {
            byProvider[record.provider] = { cost: 0, count: 0 };
        }
        byProvider[record.provider].cost += record.cost;
        byProvider[record.provider].count += 1;
    });

    const averageCostPerCall = costRecords.length > 0 
        ? totalCost / costRecords.length 
        : 0;

    const totalDuration = costRecords
        .filter(r => r.duration)
        .reduce((sum, r) => sum + (r.duration || 0), 0);
    const averageCostPerMinute = totalDuration > 0
        ? totalCost / (totalDuration / 60)
        : 0;

    return {
        period,
        totalCost,
        totalCalls: costRecords.length,
        averageCostPerCall,
        averageCostPerMinute,
        byProvider,
        currency: costRecords[0]?.currency || 'USD'
    };
}

/**
 * Get cost optimization suggestions
 */
export async function getCostOptimizationSuggestions(): Promise<string[]> {
    const stats = await getCostStats('month');
    const suggestions: string[] = [];

    // Check for high-cost providers
    const providerCosts = Object.entries(stats.byProvider)
        .sort(([, a], [, b]) => b.cost - a.cost);

    if (providerCosts.length > 1) {
        const [mostExpensive, cheapest] = [providerCosts[0], providerCosts[providerCosts.length - 1]];
        const savings = mostExpensive[1].cost - cheapest[1].cost;
        
        if (savings > 10) {
            suggestions.push(
                `Consider switching from ${mostExpensive[0]} to ${cheapest[0]} to save approximately ${savings.toFixed(2)} ${stats.currency} per month`
            );
        }
    }

    // Check for failed calls (wasted cost)
    const failedCalls = await prisma.call.count({
        where: {
            status: { in: ['failed', 'no-answer'] },
            startTime: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
    });

    if (failedCalls > 10) {
        suggestions.push(
            `You have ${failedCalls} failed calls this month. Consider improving call scheduling or retry logic to reduce wasted costs.`
        );
    }

    // Check for long calls
    const longCalls = await prisma.call.findMany({
        where: {
            durationSeconds: { gt: 600 }, // > 10 minutes
            startTime: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
    });

    if (longCalls.length > 5) {
        suggestions.push(
            `You have ${longCalls.length} calls longer than 10 minutes. Consider optimizing conversation flow to reduce call duration.`
        );
    }

    return suggestions;
}






