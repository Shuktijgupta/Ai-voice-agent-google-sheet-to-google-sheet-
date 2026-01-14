import { NextResponse } from 'next/server';
import { getCostStats, getCostOptimizationSuggestions } from '@/lib/cost-tracker';

/**
 * GET: Get cost statistics and optimization suggestions
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const period = (searchParams.get('period') || 'month') as 'day' | 'week' | 'month' | 'all';

        const stats = await getCostStats(period);
        const suggestions = await getCostOptimizationSuggestions();

        return NextResponse.json({
            ...stats,
            suggestions
        });
    } catch (error) {
        console.error('Failed to fetch cost stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch cost statistics' },
            { status: 500 }
        );
    }
}






