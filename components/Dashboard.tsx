"use client";

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Users, Phone, Activity, ArrowRight, FileText } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalDrivers: 0,
        totalCalls: 0,
        completedCalls: 0,
        failedCalls: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [driversRes, callsRes] = await Promise.all([
                    fetch('/api/drivers'),
                    fetch('/api/calls')
                ]);

                const drivers = await driversRes.json();
                const calls = await callsRes.json();

                setStats({
                    totalDrivers: Array.isArray(drivers) ? drivers.length : 0,
                    totalCalls: Array.isArray(calls) ? calls.length : 0,
                    completedCalls: Array.isArray(calls) ? calls.filter((c: any) => c.status === 'completed').length : 0,
                    failedCalls: Array.isArray(calls) ? calls.filter((c: any) => c.status === 'failed').length : 0
                });
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return (
        <Layout>
            <div className="min-h-screen flex items-center justify-center">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                </div>
            </div>
        </Layout>
    );

    return (
        <Layout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Overview of your AI Voice Agent performance</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="glass-card p-6 rounded-2xl border border-border">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-primary/10 rounded-xl text-primary">
                                <Users className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold px-2 py-1 rounded-lg bg-green-500/10 text-green-600">
                                Active
                            </span>
                        </div>
                        <h3 className="text-3xl font-bold text-foreground mb-1">{stats.totalDrivers}</h3>
                        <p className="text-sm text-muted-foreground">Total Drivers</p>
                    </div>

                    <div className="glass-card p-6 rounded-2xl border border-border">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
                                <Phone className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold px-2 py-1 rounded-lg bg-blue-500/10 text-blue-600">
                                Total
                            </span>
                        </div>
                        <h3 className="text-3xl font-bold text-foreground mb-1">{stats.totalCalls}</h3>
                        <p className="text-sm text-muted-foreground">Total Calls Made</p>
                    </div>

                    <div className="glass-card p-6 rounded-2xl border border-border">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-green-500/10 rounded-xl text-green-600">
                                <Activity className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold px-2 py-1 rounded-lg bg-green-500/10 text-green-600">
                                Success
                            </span>
                        </div>
                        <h3 className="text-3xl font-bold text-foreground mb-1">{stats.completedCalls}</h3>
                        <p className="text-sm text-muted-foreground">Completed Interviews</p>
                    </div>

                    <div className="glass-card p-6 rounded-2xl border border-border">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-red-500/10 rounded-xl text-red-600">
                                <Activity className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold px-2 py-1 rounded-lg bg-red-500/10 text-red-600">
                                Failed
                            </span>
                        </div>
                        <h3 className="text-3xl font-bold text-foreground mb-1">{stats.failedCalls}</h3>
                        <p className="text-sm text-muted-foreground">Failed / No Answer</p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Link href="/drivers" className="group">
                        <div className="glass-card p-8 rounded-2xl border border-border hover:border-primary/50 transition-all h-full flex flex-col justify-between">
                            <div>
                                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                                    <Users className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground mb-2">Manage Drivers</h3>
                                <p className="text-muted-foreground">Add new drivers, import from Google Sheets, and manage your contact list.</p>
                            </div>
                            <div className="mt-8 flex items-center gap-2 text-primary font-bold text-sm">
                                Go to Drivers <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </Link>

                    <Link href="/calls" className="group">
                        <div className="glass-card p-8 rounded-2xl border border-border hover:border-primary/50 transition-all h-full flex flex-col justify-between">
                            <div>
                                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground mb-2">Call History & Transcripts</h3>
                                <p className="text-muted-foreground">View past calls, listen to recordings, and read live transcripts.</p>
                            </div>
                            <div className="mt-8 flex items-center gap-2 text-blue-600 font-bold text-sm">
                                View History <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </Layout>
    );
}
