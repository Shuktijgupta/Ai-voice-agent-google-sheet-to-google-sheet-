"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Button3D } from '@/components/Button3D';
import { 
    Users, Phone, Activity, ArrowRight, FileText, RefreshCw, 
    TrendingUp, Clock, CheckCircle2, XCircle, PhoneCall,
    Zap, Calendar, BarChart3, Target, Play, ArrowUpRight,
    Sparkles, Bell
} from 'lucide-react';
import Link from 'next/link';
import type { DashboardStats } from '@/lib/types';

interface RecentCall {
    id: string;
    driverName: string;
    status: string;
    startTime: string;
    duration: number | null;
}

interface ExtendedStats extends DashboardStats {
    activeCalls: number;
    successRate: number;
    recentCalls: RecentCall[];
}

export default function Dashboard() {
    const [stats, setStats] = useState<ExtendedStats>({
        totalDrivers: 0,
        totalCalls: 0,
        completedCalls: 0,
        failedCalls: 0,
        activeCalls: 0,
        successRate: 0,
        recentCalls: []
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = useCallback(async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        
        try {
            const res = await fetch('/api/stats');
            if (!res.ok) throw new Error('Failed to fetch stats');
            
            const data = await res.json();
            setStats({
                totalDrivers: data.totalDrivers || 0,
                totalCalls: data.totalCalls || 0,
                completedCalls: data.completedCalls || 0,
                failedCalls: data.failedCalls || 0,
                activeCalls: data.activeCalls || 0,
                successRate: data.successRate || 0,
                recentCalls: data.recentCalls || []
            });
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(() => fetchStats(), 30000);
        return () => clearInterval(interval);
    }, [fetchStats]);

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    const formatDuration = (seconds: number | null) => {
        if (!seconds) return '--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'failed':
            case 'no-answer':
                return <XCircle className="w-4 h-4 text-red-500" />;
            case 'calling':
                return <PhoneCall className="w-4 h-4 text-blue-500 animate-pulse" />;
            default:
                return <Clock className="w-4 h-4 text-yellow-500" />;
        }
    };

    if (loading) return (
        <Layout>
            <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Zap className="w-6 h-6 text-primary animate-pulse" />
                    </div>
                </div>
                <p className="text-muted-foreground animate-pulse">Loading dashboard...</p>
            </div>
        </Layout>
    );

    const pendingDrivers = stats.totalDrivers - stats.totalCalls;

    return (
        <Layout>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-bold text-foreground tracking-tight">Dashboard</h1>
                            {stats.activeCalls > 0 && (
                                <span className="px-2.5 py-1 bg-green-500/10 text-green-600 rounded-full text-xs font-bold flex items-center gap-1.5 animate-pulse">
                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                    {stats.activeCalls} Active Call{stats.activeCalls > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        <p className="text-muted-foreground">Real-time overview of your AI Voice Agent performance</p>
                    </div>
                    <div className="flex gap-3">
                        <Link href="/drivers">
                            <Button3D variant="primary">
                                <Play className="w-4 h-4" />
                                Start Calling
                            </Button3D>
                        </Link>
                        <Button3D
                            variant="secondary"
                            onClick={() => fetchStats(true)}
                            disabled={refreshing}
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            {refreshing ? 'Refreshing...' : 'Refresh'}
                        </Button3D>
                    </div>
                </div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Total Drivers */}
                    <div className="glass-card p-6 rounded-2xl border border-border hover:border-primary/30 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-xl text-violet-600 group-hover:scale-110 transition-transform">
                                <Users className="w-6 h-6" />
                            </div>
                            <div className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg bg-violet-500/10 text-violet-600">
                                <Target className="w-3 h-3" />
                                Contacts
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-foreground mb-1">{stats.totalDrivers}</h3>
                        <p className="text-sm text-muted-foreground">Total Drivers</p>
                        <div className="mt-3 pt-3 border-t border-border">
                            <span className="text-xs text-muted-foreground">{pendingDrivers > 0 ? `${pendingDrivers} pending calls` : 'All contacted'}</span>
                        </div>
                    </div>

                    {/* Total Calls */}
                    <div className="glass-card p-6 rounded-2xl border border-border hover:border-blue-500/30 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
                                <Phone className="w-6 h-6" />
                            </div>
                            <div className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg bg-blue-500/10 text-blue-600">
                                <BarChart3 className="w-3 h-3" />
                                Total
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-foreground mb-1">{stats.totalCalls}</h3>
                        <p className="text-sm text-muted-foreground">Total Calls Made</p>
                        <div className="mt-3 pt-3 border-t border-border">
                            <span className="text-xs text-muted-foreground">{stats.activeCalls} currently active</span>
                        </div>
                    </div>

                    {/* Success Rate Card */}
                    <div className="glass-card p-6 rounded-2xl border border-border hover:border-green-500/30 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl text-green-600 group-hover:scale-110 transition-transform">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <div className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg bg-green-500/10 text-green-600">
                                <Sparkles className="w-3 h-3" />
                                Rate
                            </div>
                        </div>
                        <div className="flex items-end gap-2">
                            <h3 className="text-3xl font-bold text-foreground">{stats.successRate}%</h3>
                            <span className="text-green-600 text-sm font-semibold mb-1">success</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Completion Rate</p>
                        {/* Progress Bar */}
                        <div className="mt-3 pt-3 border-t border-border">
                            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                                    style={{ width: `${stats.successRate}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Failed Calls */}
                    <div className="glass-card p-6 rounded-2xl border border-border hover:border-red-500/30 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl text-red-600 group-hover:scale-110 transition-transform">
                                <XCircle className="w-6 h-6" />
                            </div>
                            <div className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg bg-red-500/10 text-red-600">
                                <Activity className="w-3 h-3" />
                                Failed
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-foreground mb-1">{stats.failedCalls}</h3>
                        <p className="text-sm text-muted-foreground">Failed / No Answer</p>
                        <div className="mt-3 pt-3 border-t border-border">
                            <span className="text-xs text-muted-foreground">{stats.completedCalls} completed calls</span>
                        </div>
                    </div>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Quick Actions */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Link href="/drivers" className="group">
                                <div className="glass-card p-6 rounded-2xl border border-border hover:border-primary/50 transition-all h-full flex flex-col justify-between hover:shadow-lg hover:shadow-primary/5">
                                    <div>
                                        <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-violet-500/20 rounded-2xl flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                                            <Users className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-lg font-bold text-foreground mb-2">Manage Drivers</h3>
                                        <p className="text-sm text-muted-foreground">Add new drivers, import from Google Sheets, and manage your contact list.</p>
                                    </div>
                                    <div className="mt-6 flex items-center gap-2 text-primary font-bold text-sm group-hover:gap-3 transition-all">
                                        Go to Drivers <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </Link>

                            <Link href="/calls" className="group">
                                <div className="glass-card p-6 rounded-2xl border border-border hover:border-blue-500/50 transition-all h-full flex flex-col justify-between hover:shadow-lg hover:shadow-blue-500/5">
                                    <div>
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-lg font-bold text-foreground mb-2">Call History</h3>
                                        <p className="text-sm text-muted-foreground">View past calls, listen to recordings, and read transcripts.</p>
                                    </div>
                                    <div className="mt-6 flex items-center gap-2 text-blue-600 font-bold text-sm group-hover:gap-3 transition-all">
                                        View History <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </Link>

                            <Link href="/agents" className="group">
                                <div className="glass-card p-6 rounded-2xl border border-border hover:border-purple-500/50 transition-all h-full flex flex-col justify-between hover:shadow-lg hover:shadow-purple-500/5">
                                    <div>
                                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
                                            <Zap className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-lg font-bold text-foreground mb-2">AI Agents</h3>
                                        <p className="text-sm text-muted-foreground">Configure AI calling agents with custom prompts and questions.</p>
                                    </div>
                                    <div className="mt-6 flex items-center gap-2 text-purple-600 font-bold text-sm group-hover:gap-3 transition-all">
                                        Manage Agents <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </Link>

                            <Link href="/integrations" className="group">
                                <div className="glass-card p-6 rounded-2xl border border-border hover:border-green-500/50 transition-all h-full flex flex-col justify-between hover:shadow-lg hover:shadow-green-500/5">
                                    <div>
                                        <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl flex items-center justify-center text-green-600 mb-4 group-hover:scale-110 transition-transform">
                                            <Activity className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-lg font-bold text-foreground mb-2">Integrations</h3>
                                        <p className="text-sm text-muted-foreground">Connect Google Sheets, Bland AI, and sync your data automatically.</p>
                                    </div>
                                    <div className="mt-6 flex items-center gap-2 text-green-600 font-bold text-sm group-hover:gap-3 transition-all">
                                        View Integrations <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="glass-card rounded-2xl border border-border overflow-hidden">
                        <div className="p-4 border-b border-border bg-secondary/30 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
                                <Clock className="w-4 h-4 text-primary" />
                                Recent Activity
                            </h2>
                            <Link href="/calls" className="text-xs text-primary hover:underline font-medium">
                                View All
                            </Link>
                        </div>
                        <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                            {stats.recentCalls.length > 0 ? (
                                stats.recentCalls.map((call) => (
                                    <div key={call.id} className="p-4 hover:bg-secondary/30 transition-colors">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3">
                                                {getStatusIcon(call.status)}
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">{call.driverName}</p>
                                                    <p className="text-xs text-muted-foreground capitalize">{call.status?.replace('-', ' ')}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-muted-foreground">{formatTimeAgo(call.startTime)}</p>
                                                <p className="text-xs font-mono text-muted-foreground">{formatDuration(call.duration)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center">
                                    <div className="w-12 h-12 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Bell className="w-6 h-6 text-muted-foreground/50" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">No recent activity</p>
                                    <p className="text-xs text-muted-foreground/70 mt-1">Start making calls to see activity here</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Summary Bar */}
                <div className="glass-card p-6 rounded-2xl border border-border">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <span className="text-sm text-muted-foreground">Completed: <span className="font-bold text-foreground">{stats.completedCalls}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <span className="text-sm text-muted-foreground">Failed: <span className="font-bold text-foreground">{stats.failedCalls}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                                <span className="text-sm text-muted-foreground">Active: <span className="font-bold text-foreground">{stats.activeCalls}</span></span>
                            </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Last updated: <span className="font-medium text-foreground">{new Date().toLocaleTimeString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
