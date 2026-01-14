"use client";

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Calendar, Clock, User, Phone, Plus, X, RefreshCw } from 'lucide-react';

export default function ScheduledCallsPage() {
    const [scheduledCalls, setScheduledCalls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        driverId: '',
        agentId: '',
        scheduledAt: '',
        timezone: 'Asia/Kolkata',
        recurring: '',
        maxRetries: 3
    });
    const [drivers, setDrivers] = useState<any[]>([]);
    const [agents, setAgents] = useState<any[]>([]);

    useEffect(() => {
        fetchScheduledCalls();
        fetchDrivers();
        fetchAgents();
    }, []);

    const fetchScheduledCalls = async () => {
        try {
            const res = await fetch('/api/scheduled-calls');
            const data = await res.json();
            setScheduledCalls(data);
        } catch (error) {
            console.error('Failed to fetch scheduled calls:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDrivers = async () => {
        try {
            const res = await fetch('/api/drivers');
            const data = await res.json();
            setDrivers(data);
        } catch (error) {
            console.error('Failed to fetch drivers:', error);
        }
    };

    const fetchAgents = async () => {
        try {
            const res = await fetch('/api/agents');
            const data = await res.json();
            setAgents(data);
        } catch (error) {
            console.error('Failed to fetch agents:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/scheduled-calls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setShowModal(false);
                setFormData({
                    driverId: '',
                    agentId: '',
                    scheduledAt: '',
                    timezone: 'Asia/Kolkata',
                    recurring: '',
                    maxRetries: 3
                });
                fetchScheduledCalls();
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to schedule call');
            }
        } catch (error) {
            console.error('Failed to schedule call:', error);
            alert('Failed to schedule call');
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            dateStyle: 'medium',
            timeStyle: 'short'
        });
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
                        <h1 className="text-3xl font-bold text-foreground">Scheduled Calls</h1>
                        <p className="text-muted-foreground mt-1">Manage and monitor scheduled AI calls</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-xl flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Schedule Call
                    </button>
                </div>

                {/* Scheduled Calls List */}
                <div className="glass-card rounded-2xl overflow-hidden border border-border">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-secondary/30 border-b border-border text-left">
                                    <th className="p-4 font-semibold text-sm text-muted-foreground">Scheduled Time</th>
                                    <th className="p-4 font-semibold text-sm text-muted-foreground">Driver</th>
                                    <th className="p-4 font-semibold text-sm text-muted-foreground">Agent</th>
                                    <th className="p-4 font-semibold text-sm text-muted-foreground">Recurring</th>
                                    <th className="p-4 font-semibold text-sm text-muted-foreground">Status</th>
                                    <th className="p-4 font-semibold text-sm text-muted-foreground">Retries</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {scheduledCalls.map((call) => (
                                    <tr key={call.id} className="hover:bg-secondary/20 transition-colors">
                                        <td className="p-4 text-sm text-foreground">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                                {formatDate(call.scheduledAt)}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm font-medium text-foreground">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-primary" />
                                                {call.driver?.name || 'Unknown'}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-muted-foreground">
                                            {call.agent?.name || 'Default'}
                                        </td>
                                        <td className="p-4 text-sm text-muted-foreground capitalize">
                                            {call.recurring || 'Once'}
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${
                                                call.status === 'completed'
                                                    ? 'bg-green-500/10 text-green-600 border-green-500/20'
                                                    : call.status === 'failed'
                                                        ? 'bg-red-500/10 text-red-600 border-red-500/20'
                                                        : call.status === 'queued'
                                                            ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                                            : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                                            }`}>
                                                {call.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-muted-foreground">
                                            {call.retryCount} / {call.maxRetries}
                                        </td>
                                    </tr>
                                ))}
                                {scheduledCalls.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-muted-foreground">
                                            No scheduled calls found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Schedule Modal */}
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-background rounded-3xl shadow-2xl max-w-2xl w-full border border-border">
                            <div className="p-6 border-b border-border flex justify-between items-center">
                                <h3 className="text-xl font-bold text-foreground">Schedule New Call</h3>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 hover:bg-secondary rounded-full transition-colors"
                                >
                                    <X className="w-6 h-6 text-muted-foreground" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Driver</label>
                                    <select
                                        required
                                        value={formData.driverId}
                                        onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                                        className="w-full px-4 py-2 bg-background border border-border rounded-xl"
                                    >
                                        <option value="">Select driver</option>
                                        {drivers.map(driver => (
                                            <option key={driver.id} value={driver.id}>
                                                {driver.name} - {driver.phone}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Agent (Optional)</label>
                                    <select
                                        value={formData.agentId}
                                        onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                                        className="w-full px-4 py-2 bg-background border border-border rounded-xl"
                                    >
                                        <option value="">Default Agent</option>
                                        {agents.map(agent => (
                                            <option key={agent.id} value={agent.id}>
                                                {agent.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Scheduled Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={formData.scheduledAt}
                                        onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                                        className="w-full px-4 py-2 bg-background border border-border rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Timezone</label>
                                    <select
                                        value={formData.timezone}
                                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                                        className="w-full px-4 py-2 bg-background border border-border rounded-xl"
                                    >
                                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                                        <option value="UTC">UTC</option>
                                        <option value="America/New_York">America/New_York (EST)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Recurring</label>
                                    <select
                                        value={formData.recurring}
                                        onChange={(e) => setFormData({ ...formData, recurring: e.target.value })}
                                        className="w-full px-4 py-2 bg-background border border-border rounded-xl"
                                    >
                                        <option value="">Once</option>
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Max Retries</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        value={formData.maxRetries}
                                        onChange={(e) => setFormData({ ...formData, maxRetries: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2 bg-background border border-border rounded-xl"
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl"
                                    >
                                        Schedule Call
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 bg-secondary text-foreground rounded-xl"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}






