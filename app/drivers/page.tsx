"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Button3D } from '@/components/Button3D';
import { CallDialer } from '@/components/CallDialer';
import { 
    Phone, CheckCircle, Play, FileText, User, XCircle, Upload, Download, 
    Activity, Clock, RefreshCw, Search, Filter, Trash2, MoreVertical,
    ChevronDown, X, AlertTriangle, Zap, UserPlus, Square, PhoneCall
} from 'lucide-react';
import { TRUCK_DRIVER_AGENT_CONFIG } from '@/lib/ai-agent-config';
import { useSyncStore, useClickToCallStore } from '@/lib/store';
import Link from 'next/link';

interface ActiveCall {
    driverId: string;
    currentQuestionIndex: number;
    logs: string[];
}

type StatusFilter = 'all' | 'new' | 'calling' | 'completed' | 'failed';

export default function DriversPage() {
    const [drivers, setDrivers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [sheetUrl, setSheetUrl] = useState('');
    const [importing, setImporting] = useState(false);
    const [newDriver, setNewDriver] = useState({ name: '', phone: '' });
    const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
    const [editingDriver, setEditingDriver] = useState<any>(null);
    const [selectedTranscript, setSelectedTranscript] = useState<any>(null);

    const [agents, setAgents] = useState<any[]>([]);
    const [selectedAgentId, setSelectedAgentId] = useState<string>('');

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [showFilters, setShowFilters] = useState(false);

    // Bulk Actions State
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [bulkDeleting, setBulkDeleting] = useState(false);

    // Global Sync & Dialer State from Zustand
    const {
        isAutoSyncing,
        isSyncing,
        lastSyncTime,
        isAutoDialing,
        selectedDriverIds,
        startAutoSync,
        stopAutoSync,
        setSyncing,
        setLastSyncTime,
        startAutoDialing,
        stopAutoDialing,
        setSelectedDriverIds,
        clearSelectedDrivers,
    } = useSyncStore();

    // Click-to-Call State
    const {
        isConfigured: isClickToCallConfigured,
        isDialerOpen,
        activeCall: clickToCallActive,
        initiateCall,
        openDialer,
        setConfiguration,
    } = useClickToCallStore();

    // Fetch click-to-call configuration
    useEffect(() => {
        const fetchClickToCallConfig = async () => {
            try {
                const res = await fetch('/api/click-to-call/config');
                const data = await res.json();
                setConfiguration({
                    isConfigured: data.configured,
                    virtualNumber: data.virtualNumber,
                    agentNumber: data.agentNumber,
                });
            } catch (error) {
                console.error('Failed to fetch click-to-call config:', error);
            }
        };
        fetchClickToCallConfig();
    }, [setConfiguration]);

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

    // Filtered Drivers
    const filteredDrivers = useMemo(() => {
        return drivers.filter(driver => {
            // Search filter
            const matchesSearch = searchQuery === '' || 
                driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                driver.phone.includes(searchQuery) ||
                (driver.email && driver.email.toLowerCase().includes(searchQuery.toLowerCase()));
            
            // Status filter
            const matchesStatus = statusFilter === 'all' || driver.status === statusFilter;
            
            return matchesSearch && matchesStatus;
        });
    }, [drivers, searchQuery, statusFilter]);

    // Stats for filters
    const statusCounts = useMemo(() => {
        return {
            all: drivers.length,
            new: drivers.filter(d => d.status === 'new').length,
            calling: drivers.filter(d => d.status === 'calling').length,
            completed: drivers.filter(d => d.status === 'completed').length,
            failed: drivers.filter(d => d.status === 'failed' || d.status === 'no-answer').length,
        };
    }, [drivers]);

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

    // Bulk Delete
    const handleBulkDelete = async () => {
        if (selectedDriverIds.size === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedDriverIds.size} driver(s)? This cannot be undone.`)) return;

        setBulkDeleting(true);
        try {
            const deletePromises = Array.from(selectedDriverIds).map(id =>
                fetch(`/api/drivers/${id}`, { method: 'DELETE' })
            );
            await Promise.all(deletePromises);
            setDrivers(prev => prev.filter(d => !selectedDriverIds.has(d.id)));
            setSelectedDriverIds(new Set());
            setShowBulkActions(false);
        } catch (error) {
            console.error('Bulk delete failed:', error);
            alert('Some deletions failed. Please try again.');
        } finally {
            setBulkDeleting(false);
        }
    };

    // Bulk Status Change
    const handleBulkStatusChange = async (newStatus: string) => {
        if (selectedDriverIds.size === 0) return;

        try {
            const updatePromises = Array.from(selectedDriverIds).map(id =>
                fetch(`/api/drivers/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                })
            );
            await Promise.all(updatePromises);
            setDrivers(prev => prev.map(d => 
                selectedDriverIds.has(d.id) ? { ...d, status: newStatus } : d
            ));
            setShowBulkActions(false);
        } catch (error) {
            console.error('Bulk status change failed:', error);
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
            await updateDriverStatus(driverId, 'calling');

            setActiveCall({
                driverId,
                currentQuestionIndex: 0,
                logs: [`System: Initiating AI call...`]
            });

            // Use unified AI call API - automatically routes to the selected provider
            const res = await fetch('/api/ai-call/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    driverId,
                    agentId: selectedAgentId
                }),
            });

            const data = await res.json();
            
            if (!res.ok) {
                setActiveCall(prev => prev ? { ...prev, logs: [...prev.logs, `Error: ${data.error}`] } : null);
                await updateDriverStatus(driverId, 'new');
            } else {
                const providerName = data.provider === 'elevenlabs' ? 'ElevenLabs' : 'Bland AI';
                setActiveCall(prev => prev ? { ...prev, logs: [...prev.logs, `System: Call initiated via ${providerName}. Waiting for connection...`] } : null);
            }
        } catch (error) {
            console.error('Failed to start call:', error);
            await updateDriverStatus(driverId, 'new');
        }
    };

    // Click-to-Call (Manual call through virtual number)
    const startClickToCall = async (driver: any) => {
        if (clickToCallActive) {
            alert('A call is already in progress. Please end it first.');
            return;
        }

        try {
            const res = await fetch('/api/click-to-call/initiate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    driverId: driver.id,
                    customerNumber: driver.phone,
                }),
                    });

            const data = await res.json();

            if (res.ok && data.success) {
                // Update local driver status
                setDrivers(prev => prev.map(d => d.id === driver.id ? { ...d, status: 'calling' } : d));
                
                // Initialize call in store
                initiateCall({
                    callId: data.callId,
                    dbCallId: data.dbCallId,
                    driverId: driver.id,
                    driverName: driver.name,
                    customerNumber: driver.phone,
                    status: 'initiating',
                    startTime: new Date(),
                });
            } else {
                alert(`Failed to initiate call: ${data.error || 'Unknown error'}`);
                }
            } catch (error) {
            console.error('Click-to-call error:', error);
            alert('Failed to initiate click-to-call');
        }
    };

    // Manual Sync (one-time sync button)
    const handleSync = async () => {
        if (isSyncing) return;
        setSyncing(true);
        try {
            const res = await fetch('/api/integrations/google-sheets/sync', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setLastSyncTime(new Date());
                await fetchDrivers();
                console.log('Sync complete:', data);
            } else {
                console.error('Sync failed:', data.error);
            }
        } catch (error) {
            console.error('Sync error:', error);
        } finally {
            setSyncing(false);
        }
    };

    // Refresh drivers when auto-sync completes (listen to lastSyncTime changes)
    useEffect(() => {
        if (lastSyncTime) {
            fetchDrivers();
        }
    }, [lastSyncTime]);

    const toggleSelectAll = () => {
        if (selectedDriverIds.size === filteredDrivers.length) {
            clearSelectedDrivers();
        } else {
            setSelectedDriverIds(new Set(filteredDrivers.map(d => d.id)));
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
        const headers = ['Name', 'Phone', 'Status', 'Transcript', 'Summary', 'Answers'];
        const rows = drivers.map(d => {
            const transcript = d.calls && d.calls.length > 0 ? d.calls[0].transcript || '' : '';
            const summary = d.calls && d.calls.length > 0 ? d.calls[0].summary || '' : '';
            const answers = d.responses ? JSON.stringify(d.responses) : '';

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

    // Clear selection when filters change
    useEffect(() => {
        clearSelectedDrivers();
    }, [searchQuery, statusFilter, clearSelectedDrivers]);

    if (loading) return (
        <Layout>
            <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <User className="w-6 h-6 text-primary animate-pulse" />
                </div>
                </div>
                <p className="text-muted-foreground animate-pulse">Loading drivers...</p>
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
                                <Button3D type="submit" variant="primary" fullWidth>
                                    Save Changes
                                </Button3D>
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
                                <Button3D type="submit" variant="secondary" disabled={importing} fullWidth>
                                    {importing ? 'Importing...' : 'Import Only'}
                                </Button3D>
                                <Button3D type="button" variant="primary" onClick={handleImportAndCall} disabled={importing} fullWidth>
                                    {importing ? 'Importing...' : 'Import & Call'}
                                </Button3D>
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

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground tracking-tight">Drivers</h1>
                        <p className="text-muted-foreground mt-1">Manage contacts and start AI voice calls</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button3D 
                            size="sm" 
                            variant={isAutoSyncing ? "warning" : "secondary"}
                            onClick={() => isAutoSyncing ? stopAutoSync() : startAutoSync()}
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isAutoSyncing ? 'animate-spin' : ''}`} />
                                    {isAutoSyncing ? 'Auto-Sync On' : 'Auto-Sync'}
                        </Button3D>
                        <Button3D size="sm" variant="primary" onClick={handleSync} disabled={isSyncing}>
                                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                                    {isSyncing ? 'Syncing...' : 'Sync Sheet'}
                        </Button3D>
                        <Button3D size="sm" variant="secondary" onClick={handleExport}>
                            <Download className="w-3.5 h-3.5" /> Export
                        </Button3D>
                        <Button3D size="sm" variant="success" onClick={() => setImportModalOpen(true)}>
                            <Upload className="w-3.5 h-3.5" /> Import
                        </Button3D>
                    </div>
                </div>

                {/* Search, Filter & Actions Bar */}
                <div className="glass-card p-4 rounded-2xl border border-border space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search by name, phone, or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-secondary/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/50"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded-full"
                                >
                                    <X className="w-4 h-4 text-muted-foreground" />
                                </button>
                            )}
                        </div>

                        {/* Filter Buttons */}
                        <div className="flex gap-2">
                            {(['all', 'new', 'calling', 'completed', 'failed'] as StatusFilter[]).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-3 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 capitalize ${
                                        statusFilter === status
                                            ? status === 'completed' ? 'bg-green-500 text-white' :
                                              status === 'failed' ? 'bg-red-500 text-white' :
                                              status === 'calling' ? 'bg-blue-500 text-white' :
                                              status === 'new' ? 'bg-yellow-500 text-white' :
                                              'bg-primary text-primary-foreground'
                                            : 'bg-secondary/50 text-muted-foreground hover:bg-secondary border border-border'
                                    }`}
                                >
                                    {status} ({statusCounts[status]})
                                </button>
                            ))}
                            </div>
                        </div>

                    {/* Bulk Actions & Agent Selection */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-2 border-t border-border">
                        {/* Agent Selection */}
                        <div className="flex items-center gap-3">
                            <Zap className="w-4 h-4 text-primary" />
                            <select
                                value={selectedAgentId}
                                onChange={(e) => setSelectedAgentId(e.target.value)}
                                className="px-4 py-2 bg-secondary/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                            >
                                <option value="">Default Agent (Agent 007)</option>
                                {agents.map(agent => (
                                    <option key={agent.id} value={agent.id}>
                                        {agent.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Bulk Actions */}
                        {selectedDriverIds.size > 0 && (
                            <div className="flex items-center gap-3 animate-in slide-in-from-right-5 duration-200">
                                <span className="text-sm text-muted-foreground">
                                    {selectedDriverIds.size} selected
                                </span>
                                <div className="relative">
                            <button
                                        onClick={() => setShowBulkActions(!showBulkActions)}
                                        className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl transition-colors flex items-center gap-2 text-sm font-medium border border-border"
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                        Bulk Actions
                                        <ChevronDown className="w-4 h-4" />
                                    </button>
                                    
                                    {showBulkActions && (
                                        <div className="absolute right-0 top-full mt-2 w-48 bg-background rounded-xl border border-border shadow-xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                                            <button
                                                onClick={() => handleBulkStatusChange('new')}
                                                className="w-full px-4 py-3 text-left text-sm hover:bg-secondary/50 transition-colors flex items-center gap-2"
                                            >
                                                <Clock className="w-4 h-4 text-yellow-500" />
                                                Mark as New
                                            </button>
                                            <button
                                                onClick={() => handleBulkStatusChange('completed')}
                                                className="w-full px-4 py-3 text-left text-sm hover:bg-secondary/50 transition-colors flex items-center gap-2"
                                            >
                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                                Mark as Completed
                                            </button>
                                            <button
                                                onClick={() => handleBulkStatusChange('failed')}
                                                className="w-full px-4 py-3 text-left text-sm hover:bg-secondary/50 transition-colors flex items-center gap-2"
                                            >
                                                <XCircle className="w-4 h-4 text-red-500" />
                                                Mark as Failed
                                            </button>
                                            <div className="border-t border-border">
                                                <button
                                                    onClick={handleBulkDelete}
                                                    disabled={bulkDeleting}
                                                    className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                            >
                                                    {bulkDeleting ? (
                                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                    Delete Selected
                            </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                        </div>

                {/* Add Driver Form */}
                <div className="glass-card rounded-2xl p-6 border border-border">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
                        <UserPlus className="w-5 h-5 text-primary" />
                        Add New Driver
                    </h2>
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
                        <Button3D type="submit" variant="primary">
                            <UserPlus className="w-4 h-4" />
                                Add Driver
                        </Button3D>
                        </form>
                    </div>

                {/* Auto-Dialer Control */}
                <div className="glass-card rounded-2xl p-6 border border-border bg-gradient-to-r from-primary/5 to-violet-500/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isAutoDialing ? 'bg-red-500/10 animate-pulse' : 'bg-primary/10'}`}>
                                <Play className={`w-6 h-6 ${isAutoDialing ? 'text-red-500' : 'text-primary'}`} />
                                            </div>
                                            <div>
                                <h3 className="font-bold text-foreground">Auto-Dialer</h3>
                                <p className="text-sm text-muted-foreground">
                                    {isAutoDialing
                                        ? `Calling selected drivers (${selectedDriverIds.size} in queue)...`
                                        : `Select drivers to start auto-dialing`}
                                </p>
                                            </div>
                                        </div>
                        <Button3D
                            onClick={() => isAutoDialing ? stopAutoDialing() : startAutoDialing()}
                            disabled={!isAutoDialing && selectedDriverIds.size === 0}
                            variant={isAutoDialing ? "danger" : "primary"}
                            size="lg"
                        >
                            {isAutoDialing ? (
                                <><Square className="w-5 h-5" /> Stop Dialing</>
                            ) : (
                                <><Play className="w-5 h-5" /> Start Dialing ({selectedDriverIds.size})</>
                            )}
                        </Button3D>
                                        </div>
                                    </div>

                {/* Driver List */}
                <div className="glass-card rounded-2xl overflow-hidden border border-border">
                    <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/30">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                checked={filteredDrivers.length > 0 && selectedDriverIds.size === filteredDrivers.length}
                                    onChange={toggleSelectAll}
                                    className="w-5 h-5 rounded border-border bg-background text-primary focus:ring-primary/20 transition-all cursor-pointer"
                                />
                            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                                    Driver Database
                                </h2>
                            </div>
                            <span className="px-3 py-1 rounded-full bg-background border border-border text-xs font-bold text-muted-foreground">
                            {filteredDrivers.length} of {drivers.length}
                            </span>
                        </div>
                    <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                        {filteredDrivers.map(driver => (
                            <div key={driver.id} className={`p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors group ${selectedDriverIds.has(driver.id) ? 'bg-primary/5' : ''}`}>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedDriverIds.has(driver.id)}
                                            onChange={() => toggleSelectDriver(driver.id)}
                                            className="w-5 h-5 rounded border-border bg-background text-primary focus:ring-primary/20 transition-all cursor-pointer"
                                        />
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center text-primary font-bold">
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
                                            title="Edit"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteDriver(driver.id)}
                                                className="p-2 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                                            title="Delete"
                                            >
                                            <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                    {/* Status Badge & Actions */}
                                        {driver.status === 'completed' ? (
                                            <div className="flex gap-3 items-center">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-green-500/10 text-green-600 border border-green-500/20">
                                                <CheckCircle className="w-3.5 h-3.5" /> Completed
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
                                                <XCircle className="w-3.5 h-3.5" /> Failed
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
                                                            fetchDrivers();
                                                            } catch (e) {
                                                                console.error('Sync failed', e);
                                                            }
                                                        }
                                                    }}
                                                    className="text-xs bg-secondary hover:bg-secondary/80 px-2 py-1 rounded text-muted-foreground transition-colors"
                                                >
                                                    🔄 Sync
                                                </button>
                                            </div>
                                        ) : (
                                        <div className="flex gap-2">
                                            {/* AI Call Button */}
                                            <Button3D
                                                onClick={() => startCall(driver.id)}
                                                disabled={activeCall !== null}
                                                variant="success"
                                                size="sm"
                                            >
                                                <Zap className="w-4 h-4" /> AI Call
                                            </Button3D>
                                            {/* Click-to-Call Button */}
                                            <Button3D
                                                onClick={() => startClickToCall(driver)}
                                                disabled={!!clickToCallActive}
                                                variant="primary"
                                                size="sm"
                                                title={isClickToCallConfigured ? 'Manual call through virtual number' : 'Click-to-call not configured'}
                                            >
                                                <PhoneCall className="w-4 h-4" /> Call
                                            </Button3D>
                                        </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        {filteredDrivers.length === 0 && (
                                <div className="p-12 text-center text-muted-foreground">
                                    <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    {searchQuery || statusFilter !== 'all' ? (
                                        <Search className="w-8 h-8 opacity-50" />
                                    ) : (
                                        <User className="w-8 h-8 opacity-50" />
                            )}
                        </div>
                                <p className="font-medium">
                                    {searchQuery || statusFilter !== 'all' ? 'No matching drivers found' : 'No drivers in database'}
                                </p>
                                <p className="text-sm opacity-70">
                                    {searchQuery || statusFilter !== 'all' ? 'Try adjusting your search or filters' : 'Add a driver to get started'}
                                </p>
                            </div>
                            )}
                        </div>
                    </div>
                </div>

            {/* Click-to-Call Dialer */}
            {isDialerOpen && <CallDialer />}
        </Layout>
    );
}
