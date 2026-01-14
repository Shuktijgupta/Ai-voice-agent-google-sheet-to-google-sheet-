"use client";

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { DollarSign, TrendingDown, AlertCircle, BarChart3, Download } from 'lucide-react';

export default function CostTrackingPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('month');

    useEffect(() => {
        fetchCostStats();
    }, [period]);

    const fetchCostStats = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/cost?period=${period}`);
            const data = await res.json();
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch cost stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!stats) return;

        const csv = [
            ['Period', 'Total Cost', 'Total Calls', 'Avg Cost/Call', 'Avg Cost/Minute'],
            [
                period,
                stats.totalCost.toFixed(2),
                stats.totalCalls,
                stats.averageCostPerCall.toFixed(2),
                stats.averageCostPerMinute.toFixed(2)
            ]
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `cost_report_${period}_${new Date().toISOString().split('T')[0]}.csv`;
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
                        <h1 className="text-3xl font-bold text-foreground">Cost Tracking</h1>
                        <p className="text-muted-foreground mt-1">Monitor and optimize call costs</p>
                    </div>
                    <div className="flex gap-3">
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="px-4 py-2 bg-background border border-border rounded-xl"
                        >
                            <option value="day">Last 24 hours</option>
                            <option value="week">Last 7 days</option>
                            <option value="month">Last 30 days</option>
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
                                <DollarSign className="w-6 h-6 text-green-500" />
                            </div>
                        </div>
                        <h3 className="text-sm text-muted-foreground mb-1">Total Cost</h3>
                        <p className="text-3xl font-bold text-foreground">
                            {stats?.currency || 'USD'} {stats?.totalCost.toFixed(2) || '0.00'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            {stats?.totalCalls || 0} calls
                        </p>
                    </div>

                    <div className="glass-card rounded-2xl p-6 border border-border">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-500/10 rounded-xl">
                                <BarChart3 className="w-6 h-6 text-blue-500" />
                            </div>
                        </div>
                        <h3 className="text-sm text-muted-foreground mb-1">Avg Cost/Call</h3>
                        <p className="text-3xl font-bold text-foreground">
                            {stats?.currency || 'USD'} {stats?.averageCostPerCall.toFixed(2) || '0.00'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            Per call average
                        </p>
                    </div>

                    <div className="glass-card rounded-2xl p-6 border border-border">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-500/10 rounded-xl">
                                <TrendingDown className="w-6 h-6 text-purple-500" />
                            </div>
                        </div>
                        <h3 className="text-sm text-muted-foreground mb-1">Avg Cost/Minute</h3>
                        <p className="text-3xl font-bold text-foreground">
                            {stats?.currency || 'USD'} {stats?.averageCostPerMinute.toFixed(3) || '0.000'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            Per minute average
                        </p>
                    </div>

                    <div className="glass-card rounded-2xl p-6 border border-border">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-orange-500/10 rounded-xl">
                                <AlertCircle className="w-6 h-6 text-orange-500" />
                            </div>
                        </div>
                        <h3 className="text-sm text-muted-foreground mb-1">Optimization Tips</h3>
                        <p className="text-3xl font-bold text-foreground">
                            {stats?.suggestions?.length || 0}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            Available suggestions
                        </p>
                    </div>
                </div>

                {/* Cost by Provider */}
                {stats?.byProvider && Object.keys(stats.byProvider).length > 0 && (
                    <div className="glass-card rounded-2xl p-6 border border-border">
                        <h2 className="text-xl font-bold text-foreground mb-6">Cost by Provider</h2>
                        <div className="space-y-4">
                            {Object.entries(stats.byProvider)
                                .sort(([, a], [, b]) => b.cost - a.cost)
                                .map(([provider, data]: [string, any]) => (
                                    <div key={provider} className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
                                        <div>
                                            <h3 className="font-medium text-foreground capitalize">{provider}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {data.count} calls
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-foreground">
                                                {stats.currency} {data.cost.toFixed(2)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {(data.cost / stats.totalCost * 100).toFixed(1)}% of total
                                            </p>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {/* Optimization Suggestions */}
                {stats?.suggestions && stats.suggestions.length > 0 && (
                    <div className="glass-card rounded-2xl p-6 border border-border">
                        <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-orange-500" />
                            Cost Optimization Suggestions
                        </h2>
                        <div className="space-y-3">
                            {stats.suggestions.map((suggestion: string, index: number) => (
                                <div key={index} className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                                    <p className="text-sm text-foreground">{suggestion}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}






