"use client";

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { BarChart3, TrendingUp, Clock, Users, DollarSign, Download, Calendar } from 'lucide-react';

export default function AnalyticsPage() {
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('7d');

    useEffect(() => {
        fetchAnalytics();
    }, [period]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/analytics?period=${period}&metrics=all`);
            const data = await res.json();
            setAnalytics(data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!analytics) return;
        
        const csv = [
            ['Metric', 'Value'],
            ['Period', period],
            ['Total Calls', analytics.successRate?.total || 0],
            ['Completed Calls', analytics.successRate?.completed || 0],
            ['Failed Calls', analytics.successRate?.failed || 0],
            ['Success Rate', `${analytics.successRate?.rate || 0}%`],
            ['Average Duration', `${analytics.duration?.average || 0}s`],
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `analytics_${period}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
                        <p className="text-muted-foreground mt-1">Comprehensive call analytics and insights</p>
                    </div>
                    <div className="flex gap-3">
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="px-4 py-2 bg-background border border-border rounded-xl"
                        >
                            <option value="7d">Last 7 days</option>
                            <option value="30d">Last 30 days</option>
                            <option value="90d">Last 90 days</option>
                            <option value="all">All time</option>
                        </select>
                        <button
                            onClick={handleExport}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="glass-card rounded-2xl p-6 border border-border">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-green-500/10 rounded-xl">
                                <TrendingUp className="w-6 h-6 text-green-500" />
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                                analytics?.successRate?.trend === 'up' ? 'bg-green-500/10 text-green-500' :
                                analytics?.successRate?.trend === 'down' ? 'bg-red-500/10 text-red-500' :
                                'bg-gray-500/10 text-gray-500'
                            }`}>
                                {analytics?.successRate?.trend || 'stable'}
                            </span>
                        </div>
                        <h3 className="text-sm text-muted-foreground mb-1">Success Rate</h3>
                        <p className="text-3xl font-bold text-foreground">{analytics?.successRate?.rate || 0}%</p>
                        <p className="text-xs text-muted-foreground mt-2">
                            {analytics?.successRate?.completed || 0} of {analytics?.successRate?.total || 0} calls
                        </p>
                    </div>

                    <div className="glass-card rounded-2xl p-6 border border-border">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-500/10 rounded-xl">
                                <Clock className="w-6 h-6 text-blue-500" />
                            </div>
                        </div>
                        <h3 className="text-sm text-muted-foreground mb-1">Avg Duration</h3>
                        <p className="text-3xl font-bold text-foreground">
                            {Math.floor((analytics?.duration?.average || 0) / 60)}m {(analytics?.duration?.average || 0) % 60}s
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            Min: {analytics?.duration?.min || 0}s | Max: {analytics?.duration?.max || 0}s
                        </p>
                    </div>

                    <div className="glass-card rounded-2xl p-6 border border-border">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-500/10 rounded-xl">
                                <Users className="w-6 h-6 text-purple-500" />
                            </div>
                        </div>
                        <h3 className="text-sm text-muted-foreground mb-1">Total Calls</h3>
                        <p className="text-3xl font-bold text-foreground">{analytics?.successRate?.total || 0}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                            Completed: {analytics?.successRate?.completed || 0}
                        </p>
                    </div>

                    <div className="glass-card rounded-2xl p-6 border border-border">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-orange-500/10 rounded-xl">
                                <BarChart3 className="w-6 h-6 text-orange-500" />
                            </div>
                        </div>
                        <h3 className="text-sm text-muted-foreground mb-1">Peak Hour</h3>
                        <p className="text-3xl font-bold text-foreground">
                            {analytics?.peakHours?.peak ? `${analytics.peakHours.peak}:00` : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">Most active calling time</p>
                    </div>
                </div>

                {/* Conversion Funnel */}
                {analytics?.conversion && (
                    <div className="glass-card rounded-2xl p-6 border border-border">
                        <h2 className="text-xl font-bold text-foreground mb-6">Conversion Funnel</h2>
                        <div className="grid grid-cols-4 gap-4">
                            {Object.entries(analytics.conversion.funnel).map(([stage, count]: [string, any]) => (
                                <div key={stage} className="text-center">
                                    <div className="text-3xl font-bold text-foreground mb-2">{count}</div>
                                    <div className="text-sm text-muted-foreground capitalize">{stage}</div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 space-y-2">
                            {Object.entries(analytics.conversion.rates).map(([stage, rate]: [string, any]) => (
                                <div key={stage} className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground capitalize">{stage} Rate</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-primary transition-all"
                                                style={{ width: `${rate}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-sm font-medium text-foreground w-12 text-right">{rate}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Trends Chart */}
                {analytics?.trends && (
                    <div className="glass-card rounded-2xl p-6 border border-border">
                        <h2 className="text-xl font-bold text-foreground mb-6">Daily Trends</h2>
                        <div className="space-y-4">
                            {analytics.trends.daily.map((day: any) => (
                                <div key={day.date} className="flex items-center gap-4">
                                    <div className="w-24 text-sm text-muted-foreground">
                                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </div>
                                    <div className="flex-1 flex items-center gap-2">
                                        <div className="flex-1 h-8 bg-secondary rounded-lg overflow-hidden flex">
                                            <div 
                                                className="bg-green-500 h-full flex items-center justify-end pr-2"
                                                style={{ width: `${(day.completed / Math.max(day.calls, 1)) * 100}%` }}
                                            >
                                                {day.completed > 0 && (
                                                    <span className="text-xs text-white font-medium">{day.completed}</span>
                                                )}
                                            </div>
                                            <div 
                                                className="bg-red-500 h-full flex items-center justify-end pr-2"
                                                style={{ width: `${(day.failed / Math.max(day.calls, 1)) * 100}%` }}
                                            >
                                                {day.failed > 0 && (
                                                    <span className="text-xs text-white font-medium">{day.failed}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="w-16 text-sm text-foreground text-right">{day.calls}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* By Agent Performance */}
                {analytics?.byAgent && (
                    <div className="glass-card rounded-2xl p-6 border border-border">
                        <h2 className="text-xl font-bold text-foreground mb-6">Performance by Agent</h2>
                        <div className="space-y-4">
                            {Object.entries(analytics.byAgent).map(([agentId, data]: [string, any]) => (
                                <div key={agentId} className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
                                    <div>
                                        <h3 className="font-medium text-foreground">{data.agentName}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {data.total} calls | {data.completed} completed
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-foreground">{data.successRate}%</p>
                                        <p className="text-xs text-muted-foreground">Success Rate</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}






