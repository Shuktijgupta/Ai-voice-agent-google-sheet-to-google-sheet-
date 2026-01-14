import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Advanced Analytics API
 * GET /api/analytics?period=7d&metrics=successRate,cost,duration
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || '7d'; // 7d, 30d, 90d, all
        const metrics = searchParams.get('metrics')?.split(',') || ['all'];

        // Calculate date range
        const now = new Date();
        let startDate: Date;
        switch (period) {
            case '7d':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(0);
        }

        const where = {
            startTime: { gte: startDate }
        };

        // Fetch all calls in period
        const calls = await prisma.call.findMany({
            where,
            include: {
                driver: { select: { id: true, name: true } },
                agent: { select: { id: true, name: true } },
            },
            orderBy: { startTime: 'asc' }
        });

        // Calculate metrics
        const analytics: Record<string, any> = {};

        if (metrics.includes('all') || metrics.includes('successRate')) {
            const total = calls.length;
            const completed = calls.filter(c => c.status === 'completed').length;
            const failed = calls.filter(c => c.status === 'failed' || c.status === 'no-answer').length;
            
            analytics.successRate = {
                total,
                completed,
                failed,
                rate: total > 0 ? Math.round((completed / total) * 100) : 0,
                trend: calculateTrend(calls, 'status', 'completed')
            };
        }

        if (metrics.includes('all') || metrics.includes('duration')) {
            const durations = calls
                .filter(c => c.durationSeconds)
                .map(c => c.durationSeconds!);
            
            analytics.duration = {
                average: durations.length > 0 
                    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
                    : 0,
                min: durations.length > 0 ? Math.min(...durations) : 0,
                max: durations.length > 0 ? Math.max(...durations) : 0,
                median: durations.length > 0 
                    ? durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)]
                    : 0,
                byAgent: calculateByAgent(calls, 'durationSeconds', (calls) => {
                    const durations = calls.filter(c => c.durationSeconds).map(c => c.durationSeconds!);
                    return durations.length > 0 
                        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
                        : 0;
                })
            };
        }

        if (metrics.includes('all') || metrics.includes('peakHours')) {
            const hourCounts: Record<number, number> = {};
            calls.forEach(call => {
                const hour = new Date(call.startTime).getHours();
                hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            });
            
            analytics.peakHours = {
                data: Object.entries(hourCounts)
                    .map(([hour, count]) => ({ hour: parseInt(hour), count }))
                    .sort((a, b) => b.count - a.count),
                peak: Object.entries(hourCounts)
                    .sort(([, a], [, b]) => b - a)[0]?.[0] || null
            };
        }

        if (metrics.includes('all') || metrics.includes('conversion')) {
            const drivers = await prisma.driver.findMany({
                where: { createdAt: { gte: startDate } },
                include: { calls: true }
            });

            const stages = {
                new: drivers.filter(d => d.status === 'new').length,
                calling: drivers.filter(d => d.status === 'calling').length,
                contacted: drivers.filter(d => d.status === 'contacted').length,
                completed: drivers.filter(d => d.status === 'completed').length,
            };

            analytics.conversion = {
                funnel: stages,
                rates: {
                    calling: stages.new > 0 ? Math.round((stages.calling / stages.new) * 100) : 0,
                    contacted: stages.calling > 0 ? Math.round((stages.contacted / stages.calling) * 100) : 0,
                    completed: stages.contacted > 0 ? Math.round((stages.completed / stages.contacted) * 100) : 0,
                }
            };
        }

        if (metrics.includes('all') || metrics.includes('trends')) {
            // Group by day
            const dailyData: Record<string, { date: string; calls: number; completed: number; failed: number }> = {};
            
            calls.forEach(call => {
                const date = new Date(call.startTime).toISOString().split('T')[0];
                if (!dailyData[date]) {
                    dailyData[date] = { date, calls: 0, completed: 0, failed: 0 };
                }
                dailyData[date].calls++;
                if (call.status === 'completed') dailyData[date].completed++;
                if (call.status === 'failed' || call.status === 'no-answer') dailyData[date].failed++;
            });

            analytics.trends = {
                daily: Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date))
            };
        }

        if (metrics.includes('all') || metrics.includes('byAgent')) {
            analytics.byAgent = calculateByAgent(calls, 'status', (calls) => {
                const total = calls.length;
                const completed = calls.filter(c => c.status === 'completed').length;
                return {
                    total,
                    completed,
                    successRate: total > 0 ? Math.round((completed / total) * 100) : 0
                };
            });
        }

        return NextResponse.json({
            period,
            startDate: startDate.toISOString(),
            endDate: now.toISOString(),
            ...analytics
        });
    } catch (error) {
        console.error('Analytics error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch analytics' },
            { status: 500 }
        );
    }
}

function calculateTrend(calls: any[], field: string, value: any): 'up' | 'down' | 'stable' {
    if (calls.length < 2) return 'stable';
    
    const midpoint = Math.floor(calls.length / 2);
    const firstHalf = calls.slice(0, midpoint).filter(c => c[field] === value).length;
    const secondHalf = calls.slice(midpoint).filter(c => c[field] === value).length;
    
    const firstRate = firstHalf / midpoint;
    const secondRate = secondHalf / (calls.length - midpoint);
    
    if (secondRate > firstRate * 1.1) return 'up';
    if (secondRate < firstRate * 0.9) return 'down';
    return 'stable';
}

function calculateByAgent(calls: any[], field: string, calculator: (calls: any[]) => any) {
    const byAgent: Record<string, any[]> = {};
    
    calls.forEach(call => {
        const agentId = call.agentId || 'no-agent';
        if (!byAgent[agentId]) byAgent[agentId] = [];
        byAgent[agentId].push(call);
    });

    const result: Record<string, any> = {};
    Object.entries(byAgent).forEach(([agentId, agentCalls]) => {
        const agent = agentCalls[0]?.agent;
        result[agentId] = {
            agentName: agent?.name || 'No Agent',
            ...calculator(agentCalls)
        };
    });

    return result;
}






