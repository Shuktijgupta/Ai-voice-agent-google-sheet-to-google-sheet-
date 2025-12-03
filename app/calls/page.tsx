"use client";

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Phone, Calendar, Clock, User, FileText, Play, Activity, XCircle, Download, Copy } from 'lucide-react';

export default function CallHistoryPage() {
    const [calls, setCalls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTranscript, setSelectedTranscript] = useState<any>(null);

    useEffect(() => {
        const fetchCalls = async () => {
            try {
                const res = await fetch('/api/calls');
                const data = await res.json();
                setCalls(data);
            } catch (error) {
                console.error('Failed to fetch calls:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCalls();
    }, []);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const formatDuration = (seconds: number) => {
        if (!seconds) return '0s';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const handleExport = () => {
        const headers = ['Date', 'Driver', 'Agent', 'Duration', 'Status', 'Recording URL', 'Transcript', 'Summary'];
        const rows = calls.map(call => {
            const escape = (str: string) => `"${String(str || '').replace(/"/g, '""')}"`;
            return [
                escape(formatDate(call.startTime)),
                escape(call.driver?.name),
                escape(call.agent?.name),
                escape(formatDuration(call.durationSeconds)),
                escape(call.status),
                escape(call.recordingUrl),
                escape(call.transcript),
                escape(call.summary)
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `call_history_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCopyToSheets = () => {
        const headers = ['Date', 'Driver', 'Agent', 'Duration', 'Status', 'Recording URL', 'Transcript', 'Summary'];
        const rows = calls.map(call => {
            // TSV format: no quotes usually needed unless tab/newline in content, but simple replacement is safer
            const clean = (str: string) => String(str || '').replace(/\t/g, ' ').replace(/\n/g, ' ');
            return [
                clean(formatDate(call.startTime)),
                clean(call.driver?.name),
                clean(call.agent?.name),
                clean(formatDuration(call.durationSeconds)),
                clean(call.status),
                clean(call.recordingUrl),
                clean(call.transcript),
                clean(call.summary)
            ].join('\t');
        });

        const tsvContent = [headers.join('\t'), ...rows].join('\n');
        navigator.clipboard.writeText(tsvContent).then(() => {
            alert('Data copied! Opening Google Sheets... Press Ctrl+V (or Cmd+V) to paste.');
            window.open('https://sheets.new', '_blank');
        }).catch(err => {
            console.error('Failed to copy:', err);
            alert('Failed to copy to clipboard. Please try again.');
        });
    };

    const [activeCall, setActiveCall] = useState<any>(null);

    // Poll for active calls
    useEffect(() => {
        const checkActiveCalls = async () => {
            try {
                // Check if any driver is in 'calling' state
                const res = await fetch('/api/drivers');
                const drivers = await res.json();
                const activeDriver = drivers.find((d: any) => d.status === 'calling');

                if (activeDriver) {
                    // In a real app, you'd fetch live logs from a websocket or API
                    // For now, we'll simulate or show a placeholder if no logs are available
                    setActiveCall({
                        driverId: activeDriver.id,
                        logs: [`System: Call in progress with ${activeDriver.name}...`]
                    });
                } else {
                    setActiveCall(null);
                }
            } catch (error) {
                console.error('Failed to check active calls:', error);
            }
        };

        const interval = setInterval(checkActiveCalls, 3000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
            </div>
        </div>
    );

    return (
        <Layout>
            {/* Transcript Modal */}
            {selectedTranscript && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-background rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col border border-border animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-border flex justify-between items-center bg-background/80 backdrop-blur-md rounded-t-3xl sticky top-0 z-10">
                            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary" />
                                Call Transcript
                            </h3>
                            <button onClick={() => setSelectedTranscript(null)} className="p-2 hover:bg-secondary rounded-full transition-colors">
                                <XCircle className="w-6 h-6 text-muted-foreground" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 text-foreground whitespace-pre-wrap leading-relaxed font-mono text-sm bg-secondary/10">
                            {selectedTranscript.transcript || "No transcript available."}
                        </div>
                        <div className="p-6 border-t border-border bg-secondary/30 rounded-b-3xl">
                            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-primary" />
                                AI Summary
                            </h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">{selectedTranscript.summary || "No summary available."}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground tracking-tight">Call History</h1>
                        <p className="text-muted-foreground mt-1">View logs and recordings of all AI calls</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleCopyToSheets}
                            className="px-4 py-2 bg-green-500/10 text-green-600 hover:bg-green-500/20 border border-green-500/20 rounded-xl transition-colors flex items-center gap-2 font-medium"
                        >
                            <FileText className="w-4 h-4" />
                            Export to Google Sheet
                        </button>
                        <div className="glass-card px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium text-primary">
                            <Activity className="w-4 h-4" />
                            Total Calls: {calls.length}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Main History Table */}
                    <div className="lg:col-span-2 glass-card rounded-2xl overflow-hidden border border-border">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-secondary/30 border-b border-border text-left">
                                        <th className="p-4 font-semibold text-sm text-muted-foreground">Date & Time</th>
                                        <th className="p-4 font-semibold text-sm text-muted-foreground">Driver</th>
                                        <th className="p-4 font-semibold text-sm text-muted-foreground">Duration</th>
                                        <th className="p-4 font-semibold text-sm text-muted-foreground">Status</th>
                                        <th className="p-4 font-semibold text-sm text-muted-foreground">Recording</th>
                                        <th className="p-4 font-semibold text-sm text-muted-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {calls.map((call) => (
                                        <tr key={call.id} className="hover:bg-secondary/20 transition-colors">
                                            <td className="p-4 text-sm text-foreground whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                                    {formatDate(call.startTime)}
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm font-medium text-foreground">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-primary" />
                                                    {call.driver?.name || 'Unknown'}
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm text-muted-foreground font-mono">
                                                {formatDuration(call.durationSeconds)}
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${call.status === 'completed'
                                                    ? 'bg-green-500/10 text-green-600 border-green-500/20'
                                                    : call.status === 'failed' || call.status === 'no-answer'
                                                        ? 'bg-red-500/10 text-red-600 border-red-500/20'
                                                        : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                                    }`}>
                                                    {call.status || 'Unknown'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                {call.recordingUrl ? (
                                                    <audio controls className="h-8 w-32 rounded-lg">
                                                        <source src={call.recordingUrl} type="audio/mpeg" />
                                                    </audio>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">No recording</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <button
                                                    onClick={() => setSelectedTranscript(call)}
                                                    className="p-2 hover:bg-secondary rounded-lg transition-colors text-primary hover:text-primary/80"
                                                    title="View Transcript"
                                                >
                                                    <FileText className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {calls.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-muted-foreground">
                                                No calls found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Live Call Transcript (Right Column) */}
                    <div className="space-y-8 sticky top-6">
                        <div className="glass-card rounded-2xl overflow-hidden h-[500px] flex flex-col">
                            <div className="p-4 border-b border-border bg-secondary/30">
                                <h2 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
                                    <div className={`w-2 h-2 rounded-full ${activeCall ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-muted-foreground'}`}></div>
                                    Live Call Transcript
                                </h2>
                            </div>
                            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-background/50 scrollbar-thin scrollbar-thumb-border">
                                {activeCall ? (
                                    activeCall.logs.map((log: string, i: number) => (
                                        <div key={i} className={`flex ${log.startsWith('Agent:') ? 'justify-start' : log.startsWith('Driver:') ? 'justify-end' : 'justify-center'}`}>
                                            <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${log.startsWith('Agent:')
                                                ? 'bg-card text-foreground rounded-tl-none border border-border'
                                                : log.startsWith('Driver:')
                                                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                                                    : 'bg-transparent shadow-none text-muted-foreground text-xs py-1 font-mono'
                                                }`}>
                                                {log.replace(/^(Agent:|Driver:|System:)\s*/, '')}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
                                        <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center animate-pulse">
                                            <Phone className="w-10 h-10 opacity-20" />
                                        </div>
                                        <div className="text-center">
                                            <p className="font-medium text-foreground">No Active Calls</p>
                                            <p className="text-sm opacity-70">Live transcripts will appear here</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
