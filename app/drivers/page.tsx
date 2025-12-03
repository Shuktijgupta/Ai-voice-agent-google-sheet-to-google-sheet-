"use client";

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Phone, CheckCircle, Play, FileText, User, XCircle, Upload, Download, Activity, Clock, RefreshCw } from 'lucide-react';
import { TRUCK_DRIVER_AGENT_CONFIG } from '@/lib/ai-agent-config';
import Link from 'next/link';

interface ActiveCall {
    driverId: string;
    currentQuestionIndex: number;
    logs: string[];
}

export default function DriversPage() {
    const [drivers, setDrivers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [sheetUrl, setSheetUrl] = useState('');
    const [importing, setImporting] = useState(false);
    const [newDriver, setNewDriver] = useState({ name: '', phone: '' });
    const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
    const [isAutoDialing, setIsAutoDialing] = useState(false);
    const [selectedDriverIds, setSelectedDriverIds] = useState<Set<string>>(new Set());
    const [editingDriver, setEditingDriver] = useState<any>(null);
    const [selectedTranscript, setSelectedTranscript] = useState<any>(null);

    const [agents, setAgents] = useState<any[]>([]);
    const [selectedAgentId, setSelectedAgentId] = useState<string>('');

    // Sync State
    const [isSyncing, setIsSyncing] = useState(false);
    const [isAutoSyncing, setIsAutoSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

    const fetchDrivers = async () => {
        try {
            const res = await fetch('/api/drivers');
            const data = await res.json();
            setDrivers(data);
            return data;
        } catch (error) {
            console.error('Failed to fetch drivers:', error);
            return [];
        } finally {
            setLoading(false);
        }
    };

    const fetchAgents = async () => {
        try {
            const res = await fetch('/api/agents');
            const data = await res.json();
            setAgents(data);
            if (data.length > 0) {
                setSelectedAgentId(data[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch agents:', error);
        }
    };

    useEffect(() => {
        fetchDrivers();
        fetchAgents();
    }, []);

    const handleDeleteDriver = async (id: string) => {
        if (!confirm('Are you sure you want to delete this driver? This will also delete all associated call logs.')) return;

        try {
            const res = await fetch(`/api/drivers/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setDrivers(prev => prev.filter(d => d.id !== id));
                setSelectedDriverIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(id);
                    return newSet;
                });
            } else {
                alert('Failed to delete driver');
            }
        } catch (error) {
            console.error('Failed to delete driver:', error);
            alert('Error deleting driver');
        }
    };

    const handleUpdateDriver = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingDriver) return;

        try {
            const res = await fetch(`/api/drivers/${editingDriver.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editingDriver.name,
                    phone: editingDriver.phone,
                    email: editingDriver.email
                }),
            });

            if (res.ok) {
                const updated = await res.json();
                setDrivers(prev => prev.map(d => d.id === updated.id ? { ...d, ...updated } : d));
                setEditingDriver(null);
            } else {
                alert('Failed to update driver');
            }
        } catch (error) {
            console.error('Failed to update driver:', error);
            alert('Error updating driver');
        }
    };

    const handleImport = async (e: React.FormEvent) => {
        e.preventDefault();
        setImporting(true);
        try {
            const res = await fetch('/api/drivers/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sheetUrl }),
            });
            const data = await res.json();
            if (res.ok) {
                alert(`Successfully imported ${data.count} drivers!`);
                setImportModalOpen(false);
                setSheetUrl('');
                fetchDrivers();
            } else {
                alert(`Import failed: ${data.error}`);
            }
        } catch (error) {
            alert('Import failed. Please check the URL.');
        } finally {
            setImporting(false);
        }
    };

    const handleImportAndCall = async () => {
        setImporting(true);
        try {
            const res = await fetch('/api/drivers/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sheetUrl }),
            });
            const data = await res.json();
            if (res.ok) {
                alert(`Successfully imported ${data.count} drivers!`);
                setImportModalOpen(false);
                setSheetUrl('');
                const updatedDrivers = await fetchDrivers();

                // Select all new drivers and start dialing
                const newDriverIds = updatedDrivers
                    .filter((d: any) => d.status === 'new')
                    .map((d: any) => d.id);
                setSelectedDriverIds(new Set(newDriverIds));
                setIsAutoDialing(true);
            } else {
                alert(`Import failed: ${data.error}`);
            }
        } catch (error) {
            alert('Import failed. Please check the URL.');
        } finally {
            setImporting(false);
        }
    };

    const addDriver = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/drivers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newDriver),
            });
            if (res.ok) {
                const driver = await res.json();
                setDrivers(prev => [{ ...driver, responses: {} }, ...prev]);
                setNewDriver({ name: '', phone: '' });
            }
        } catch (error) {
            console.error('Failed to add driver:', error);
        }
    };

    const updateDriverStatus = async (id: string, status: string) => {
        try {
            await fetch(`/api/drivers/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            setDrivers(prev => prev.map(d => d.id === id ? { ...d, status } : d));
        } catch (error) {
            console.error('Failed to update driver status:', error);
        }
    };

    const startCall = async (driverId: string) => {
        try {
            // Optimistic update
            await updateDriverStatus(driverId, 'calling');

            setActiveCall({
                driverId,
                currentQuestionIndex: 0,
                logs: [`System: Initiating call via Bland AI...`]
            });

            const res = await fetch('/api/bland/start-call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    driverId,
                    agentId: selectedAgentId // Pass selected agent
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                setActiveCall(prev => prev ? { ...prev, logs: [...prev.logs, `Error: ${error.error}`] } : null);
                await updateDriverStatus(driverId, 'new'); // Revert status
            } else {
                setActiveCall(prev => prev ? { ...prev, logs: [...prev.logs, `System: Call initiated successfully. Waiting for connection...`] } : null);
            }
        } catch (error) {
            console.error('Failed to start call:', error);
            await updateDriverStatus(driverId, 'new');
        }
    };

    // Auto-Dialer Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isAutoDialing) {
            interval = setInterval(async () => {
                const currentDrivers = await fetchDrivers();

                // Check if any call is currently active
                const activeCall = currentDrivers.find((d: any) => d.status === 'calling');
                if (activeCall) return; // Wait for current call to finish

                // Find next new driver THAT IS SELECTED
                const nextDriver = currentDrivers.find((d: any) => d.status === 'new' && selectedDriverIds.has(d.id));

                if (nextDriver) {
                    console.log(`Auto-Dialer: Starting call for ${nextDriver.name}`);
                    startCall(nextDriver.id);
                } else {
                    // No new drivers left in selection
                    setIsAutoDialing(false);
                    alert('Auto-Dialer: All selected calls completed!');
                }
            }, 5000); // Check every 5 seconds
        }

        return () => clearInterval(interval);
    }, [isAutoDialing, selectedDriverIds]);

    // Sync Logic
    const handleSync = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        try {
            const res = await fetch('/api/integrations/google-sheets/sync', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setLastSyncTime(new Date());
                await fetchDrivers(); // Refresh list
                console.log('Sync complete:', data);
            } else {
                console.error('Sync failed:', data.error);
                // Optional: alert('Sync failed: ' + data.error);
            }
        } catch (error) {
            console.error('Sync error:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    // Auto-Sync Effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isAutoSyncing) {
            handleSync(); // Sync immediately on enable
            interval = setInterval(handleSync, 30000); // Every 30 seconds
        }
        return () => clearInterval(interval);
    }, [isAutoSyncing]);

    const toggleSelectAll = () => {
        if (selectedDriverIds.size === drivers.length) {
            setSelectedDriverIds(new Set());
        } else {
            setSelectedDriverIds(new Set(drivers.map(d => d.id)));
        }
    };

    const toggleSelectDriver = (id: string) => {
        const newSelected = new Set(selectedDriverIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedDriverIds(newSelected);
    };

    const handleExport = () => {
        // Generate CSV
        const headers = ['Name', 'Phone', 'Status', 'Transcript', 'Summary', 'Answers'];
        const rows = drivers.map(d => {
            const transcript = d.calls && d.calls.length > 0 ? d.calls[0].transcript || '' : '';
            const summary = d.calls && d.calls.length > 0 ? d.calls[0].summary || '' : '';
            const answers = d.responses ? JSON.stringify(d.responses) : '';

            // Escape quotes for CSV
            const escape = (str: string) => `"${String(str).replace(/"/g, '""')}"`;

            return [
                escape(d.name),
                escape(d.phone),
                escape(d.status),
                escape(transcript),
                escape(summary),
                escape(answers)
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'call_report.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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
            {/* Edit Modal */}
            {editingDriver && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-background rounded-3xl shadow-2xl max-w-md w-full p-6 border border-border animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                                <User className="w-5 h-5 text-primary" />
                                Edit Driver
                            </h3>
                            <button onClick={() => setEditingDriver(null)} className="p-2 hover:bg-secondary rounded-full transition-colors">
                                <XCircle className="w-6 h-6 text-muted-foreground" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateDriver} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-1 block">Name</label>
                                <input
                                    type="text"
                                    value={editingDriver.name}
                                    onChange={e => setEditingDriver({ ...editingDriver, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-1 block">Phone</label>
                                <input
                                    type="tel"
                                    value={editingDriver.phone}
                                    onChange={e => setEditingDriver({ ...editingDriver, phone: e.target.value })}
                                    className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-1 block">Email</label>
                                <input
                                    type="email"
                                    value={editingDriver.email || ''}
                                    onChange={e => setEditingDriver({ ...editingDriver, email: e.target.value })}
                                    className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                            </div>
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-all shadow-lg shadow-primary/25"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {importModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-background rounded-3xl shadow-2xl max-w-md w-full p-6 border border-border animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                                <Upload className="w-5 h-5 text-primary" />
                                Import Drivers
                            </h3>
                            <button onClick={() => setImportModalOpen(false)} className="p-2 hover:bg-secondary rounded-full transition-colors">
                                <XCircle className="w-6 h-6 text-muted-foreground" />
                            </button>
                        </div>
                        <p className="text-sm text-muted-foreground mb-6">
                            Paste the link to a <strong>Public</strong> Google Sheet. It must have columns for <strong>Name</strong> and <strong>Phone</strong>.
                        </p>
                        <form onSubmit={handleImport} className="space-y-4">
                            <input
                                type="url"
                                placeholder="https://docs.google.com/spreadsheets/d/..."
                                value={sheetUrl}
                                onChange={e => setSheetUrl(e.target.value)}
                                className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/50"
                                required
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="submit"
                                    disabled={importing}
                                    className="w-full py-3 bg-secondary hover:bg-secondary/80 text-foreground font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    {importing ? 'Importing...' : 'Import Only'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleImportAndCall}
                                    disabled={importing}
                                    className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 flex items-center justify-center gap-2"
                                >
                                    {importing ? 'Importing...' : 'Import & Call'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Left Column: Driver Management */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Add Driver Card */}
                    <div className="glass-card rounded-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Phone className="w-5 h-5 text-primary" />
                                Add New Driver
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsAutoSyncing(!isAutoSyncing)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${isAutoSyncing
                                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                                        : 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20'
                                        }`}
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isAutoSyncing ? 'animate-spin' : ''}`} />
                                    {isAutoSyncing ? 'Auto-Sync On' : 'Auto-Sync'}
                                </button>
                                <button
                                    onClick={handleSync}
                                    disabled={isSyncing}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${isSyncing ? 'bg-blue-500/10 text-blue-600' : 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20'
                                        }`}
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                                    {isSyncing ? 'Syncing...' : 'Sync Sheet'}
                                </button>
                                <button
                                    onClick={handleExport}
                                    className="px-3 py-1.5 text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground rounded-lg transition-colors flex items-center gap-1.5"
                                >
                                    <Download className="w-3.5 h-3.5" /> Export CSV
                                </button>
                                <button
                                    onClick={() => setImportModalOpen(true)}
                                    className="px-3 py-1.5 text-xs font-semibold bg-green-500/10 text-green-600 hover:bg-green-500/20 rounded-lg transition-colors flex items-center gap-1.5"
                                >
                                    <Upload className="w-3.5 h-3.5" /> Import Sheet
                                </button>
                            </div>
                        </div>

                        {/* Agent Selection */}
                        <div className="mb-6">
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">Select Calling Agent</label>
                            <select
                                value={selectedAgentId}
                                onChange={(e) => setSelectedAgentId(e.target.value)}
                                className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            >
                                <option value="">Default Agent (Agent 007)</option>
                                {agents.map(agent => (
                                    <option key={agent.id} value={agent.id}>
                                        {agent.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Auto-Dialer Control */}
                        <div className="mb-6 flex items-center justify-between bg-secondary/30 p-4 rounded-xl border border-border">
                            <div>
                                <h3 className="font-semibold text-foreground text-sm">Auto-Dialer</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {isAutoDialing
                                        ? `Calling selected drivers (${selectedDriverIds.size} selected)...`
                                        : `Select drivers to start auto-dialing`}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsAutoDialing(!isAutoDialing)}
                                disabled={!isAutoDialing && selectedDriverIds.size === 0}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 shadow-sm ${isAutoDialing
                                    ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/20'
                                    : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 disabled:opacity-50 disabled:cursor-not-allowed'
                                    }`}
                            >
                                {isAutoDialing ? (
                                    <><XCircle className="w-4 h-4" /> Stop Dialing</>
                                ) : (
                                    <><Play className="w-4 h-4" /> Start Auto-Dialer ({selectedDriverIds.size})</>
                                )}
                            </button>
                        </div>

                        <form onSubmit={addDriver} className="flex flex-col sm:flex-row gap-4">
                            <input
                                type="text"
                                placeholder="Driver Name"
                                value={newDriver.name}
                                onChange={e => setNewDriver({ ...newDriver, name: e.target.value })}
                                className="flex-1 px-4 py-3 bg-secondary/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/50"
                                required
                            />
                            <input
                                type="tel"
                                placeholder="Phone Number"
                                value={newDriver.phone}
                                onChange={e => setNewDriver({ ...newDriver, phone: e.target.value })}
                                className="flex-1 px-4 py-3 bg-secondary/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/50"
                                required
                            />
                            <button
                                type="submit"
                                className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 flex items-center justify-center gap-2 whitespace-nowrap"
                            >
                                Add Driver
                            </button>
                        </form>
                    </div>

                    {/* Active Queue Section - Conditionally Visible */}
                    {(isAutoDialing || selectedDriverIds.size > 0) && (
                        <div className="glass-card rounded-2xl overflow-hidden mb-8 border-2 border-primary/20 shadow-lg shadow-primary/10 animate-in slide-in-from-top-4 duration-300">
                            <div className="p-4 border-b border-border flex justify-between items-center bg-primary/5">
                                <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                                    <Play className="w-5 h-5" />
                                    Active Call Queue
                                </h2>
                                <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                    {selectedDriverIds.size} queued
                                </span>
                            </div>
                            <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
                                {drivers.filter(d => selectedDriverIds.has(d.id)).map(driver => (
                                    <div key={driver.id} className="p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                                {driver.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-foreground text-sm">{driver.name}</h3>
                                                <p className="text-xs text-muted-foreground">{driver.phone}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {driver.status === 'calling' && (
                                                <span className="text-xs font-bold text-blue-500 animate-pulse mr-2">Calling...</span>
                                            )}
                                            <button
                                                onClick={() => toggleSelectDriver(driver.id)}
                                                className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded-lg transition-colors"
                                                title="Remove from Queue"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Driver Database Card */}
                    <div className="glass-card rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-border flex justify-between items-center bg-secondary/30">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={drivers.length > 0 && selectedDriverIds.size === drivers.length}
                                    onChange={toggleSelectAll}
                                    className="w-5 h-5 rounded border-border bg-background text-primary focus:ring-primary/20 transition-all cursor-pointer"
                                />
                                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-primary" />
                                    Driver Database
                                </h2>
                            </div>
                            <span className="px-3 py-1 rounded-full bg-background border border-border text-xs font-bold text-muted-foreground">
                                {drivers.length} total
                            </span>
                        </div>
                        <div className="divide-y divide-border">
                            {Array.isArray(drivers) && drivers.map(driver => (
                                <div key={driver.id} className={`p-5 flex items-center justify-between hover:bg-secondary/30 transition-colors group ${selectedDriverIds.has(driver.id) ? 'bg-primary/5' : ''}`}>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedDriverIds.has(driver.id)}
                                            onChange={() => toggleSelectDriver(driver.id)}
                                            className="w-5 h-5 rounded border-border bg-background text-primary focus:ring-primary/20 transition-all cursor-pointer"
                                        />
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center text-primary font-bold text-lg">
                                            {driver.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{driver.name}</h3>
                                            <p className="text-sm text-muted-foreground">{driver.phone}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {/* Edit/Delete Actions */}
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setEditingDriver(driver)}
                                                className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-primary transition-colors"
                                                title="Edit Driver"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteDriver(driver.id)}
                                                className="p-2 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                                                title="Delete Driver"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                            </button>
                                        </div>

                                        {driver.status === 'completed' ? (
                                            <div className="flex gap-3 items-center">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-green-500/10 text-green-600 border border-green-500/20">
                                                    <CheckCircle className="w-3.5 h-3.5" /> Qualified
                                                </span>
                                                {driver.calls && driver.calls.length > 0 && (
                                                    <button
                                                        onClick={() => setSelectedTranscript(driver.calls[0])}
                                                        className="text-xs font-semibold text-primary hover:underline"
                                                    >
                                                        View Transcript
                                                    </button>
                                                )}
                                            </div>
                                        ) : driver.status === 'failed' ? (
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-500/10 text-red-600 border border-red-500/20">
                                                    <XCircle className="w-3.5 h-3.5" /> Call Failed
                                                </span>
                                                <button
                                                    onClick={() => startCall(driver.id)}
                                                    className="text-xs font-semibold text-primary hover:underline"
                                                >
                                                    Retry
                                                </button>
                                            </div>
                                        ) : driver.status === 'calling' ? (
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 animate-pulse">
                                                    <Phone className="w-3.5 h-3.5" /> In Call
                                                </span>
                                                <button
                                                    onClick={async () => {
                                                        if (driver.calls && driver.calls.length > 0) {
                                                            const callId = driver.calls[0].id;
                                                            try {
                                                                await fetch(`/api/calls/${callId}/sync`, { method: 'POST' });
                                                                fetchDrivers(); // Refresh list
                                                            } catch (e) {
                                                                console.error('Sync failed', e);
                                                            }
                                                        }
                                                    }}
                                                    className="text-xs bg-secondary hover:bg-secondary/80 px-2 py-1 rounded text-muted-foreground transition-colors"
                                                    title="Sync Status (Use on Localhost)"
                                                >
                                                    🔄 Sync
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => startCall(driver.id)}
                                                disabled={activeCall !== null}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                                            >
                                                <Phone className="w-4 h-4" /> Call Now
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {drivers.length === 0 && (
                                <div className="p-12 text-center text-muted-foreground">
                                    <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <User className="w-8 h-8 opacity-50" />
                                    </div>
                                    <p className="font-medium">No drivers in database</p>
                                    <p className="text-sm opacity-70">Add a driver to get started</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Recent Results */}
                <div className="space-y-8 sticky top-6">
                    {/* Interview Results Preview */}
                    <div className="glass-card rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-border bg-secondary/30">
                            <h2 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
                                <FileText className="w-4 h-4" /> Recent Results
                            </h2>
                        </div>
                        <div className="p-4 max-h-[400px] overflow-y-auto">
                            {drivers.filter(d => d.status === 'completed').length > 0 ? (
                                <div className="space-y-4">
                                    {drivers.filter(d => d.status === 'completed').map(driver => (
                                        <div key={driver.id} className="border border-border rounded-xl p-4 hover:border-primary/50 transition-colors bg-secondary/10">
                                            <h4 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                {driver.name}
                                            </h4>
                                            <div className="space-y-3">
                                                {driver.responses && Object.entries(driver.responses).map(([key, value]) => (
                                                    <div key={key} className="text-sm group">
                                                        <span className="text-muted-foreground text-xs block mb-0.5 font-medium group-hover:text-primary transition-colors">
                                                            {TRUCK_DRIVER_AGENT_CONFIG.questions.find(q => q.id === key)?.text}
                                                        </span>
                                                        <span className="text-foreground pl-2 border-l-2 border-primary/20 block">
                                                            {String(value)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No completed interviews yet
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div >
        </Layout >
    );
}
