"use client";

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Button3D } from '@/components/Button3D';
import { useSyncStore, useClickToCallStore } from '@/lib/store';
import { 
    CheckCircle2, 
    XCircle, 
    ExternalLink, 
    RefreshCw, 
    Settings, 
    Zap, 
    ArrowRight,
    Sparkles,
    Database,
    Phone,
    Link2,
    Shield,
    Clock,
    TrendingUp,
    Power,
    PhoneCall,
    Headphones,
    Mic,
    Volume2,
    Check,
    Cpu,
    Server
} from 'lucide-react';

interface IntegrationStatus {
    googleSheets: boolean;
    blandAi: boolean;
    elevenLabs: boolean;
    bolna: boolean;
    sheetId?: string;
}

interface ProviderInfo {
    id: string;
    name: string;
    configured: boolean;
    description: string;
    local?: boolean;
    config?: {
        llm?: string;
        tts?: string;
        isFullyLocal?: boolean;
    };
}

interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

export default function IntegrationsPage() {
    const [status, setStatus] = useState<IntegrationStatus>({
        googleSheets: false,
        blandAi: false,
        elevenLabs: false,
        bolna: false
    });
    const [loading, setLoading] = useState(true);
    const [testingBland, setTestingBland] = useState(false);
    const [testingElevenLabs, setTestingElevenLabs] = useState(false);
    const [testingBolna, setTestingBolna] = useState(false);
    const [testingClickToCall, setTestingClickToCall] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [bolnaConfig, setBolnaConfig] = useState<{ llm?: string; tts?: string; isFullyLocal?: boolean } | null>(null);
    
    // AI Provider selection state
    const [defaultProvider, setDefaultProvider] = useState<string>('bland');
    const [availableProviders, setAvailableProviders] = useState<ProviderInfo[]>([]);
    const [savingProvider, setSavingProvider] = useState(false);

    // Global sync state
    const {
        isAutoSyncing,
        isSyncing: syncing,
        lastSyncTime,
        startAutoSync,
        stopAutoSync,
        setSyncing,
        setLastSyncTime,
    } = useSyncStore();

    // Click-to-call state
    const {
        isConfigured: isClickToCallConfigured,
        virtualNumber,
        agentNumber,
        setConfiguration: setClickToCallConfig,
    } = useClickToCallStore();

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };

    useEffect(() => {
        checkStatus();
        checkClickToCallStatus();
        checkProviderSettings();
    }, []);
    
    const checkProviderSettings = async () => {
        try {
            const res = await fetch('/api/settings/provider');
            const data = await res.json();
            setDefaultProvider(data.provider || 'bland');
            setAvailableProviders(data.availableProviders || []);
            
            // Update provider statuses
            const elevenLabsProvider = data.availableProviders?.find((p: ProviderInfo) => p.id === 'elevenlabs');
            const bolnaProvider = data.availableProviders?.find((p: ProviderInfo) => p.id === 'bolna');
            
            setStatus(prev => ({ 
                ...prev, 
                elevenLabs: elevenLabsProvider?.configured || false,
                bolna: bolnaProvider?.configured || false,
            }));
            
            // Store Bolna config if available
            if (bolnaProvider?.config) {
                setBolnaConfig(bolnaProvider.config);
            }
        } catch (error) {
            console.error('Failed to fetch provider settings:', error);
        }
    };
    
    const handleProviderChange = async (providerId: string) => {
        setSavingProvider(true);
        try {
            const res = await fetch('/api/settings/provider', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: providerId }),
            });
            const data = await res.json();
            if (res.ok) {
                setDefaultProvider(providerId);
                const providerNames: Record<string, string> = {
                    bland: 'Bland AI',
                    elevenlabs: 'ElevenLabs',
                    bolna: 'Bolna (Local AI)',
                };
                showToast(`Default AI caller set to ${providerNames[providerId] || providerId}`, 'success');
            } else {
                showToast(data.error || 'Failed to update provider', 'error');
            }
        } catch (error) {
            showToast('Failed to update provider', 'error');
        } finally {
            setSavingProvider(false);
        }
    };
    
    const handleTestElevenLabs = async () => {
        setTestingElevenLabs(true);
        try {
            const res = await fetch('/api/settings/provider');
            const data = await res.json();
            const elevenLabsProvider = data.availableProviders?.find((p: ProviderInfo) => p.id === 'elevenlabs');
            if (elevenLabsProvider?.configured) {
                setStatus(prev => ({ ...prev, elevenLabs: true }));
                showToast('ElevenLabs is configured and ready!', 'success');
            } else {
                showToast('ElevenLabs not configured. Add ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID to .env', 'error');
            }
        } catch (error) {
            showToast('Failed to test ElevenLabs connection', 'error');
        } finally {
            setTestingElevenLabs(false);
        }
    };
    
    const handleTestBolna = async () => {
        setTestingBolna(true);
        try {
            const res = await fetch('/api/bolna/config');
            const data = await res.json();
            
            // Check Ollama status first (can work without full Bolna server)
            if (data.ollama?.running) {
                const modelCount = data.ollama.models?.length || 0;
                if (modelCount > 0) {
                    showToast(`✅ Ollama running with ${modelCount} model(s): ${data.ollama.models.slice(0, 2).join(', ')}`, 'success');
                    setBolnaConfig({
                        llm: `ollama/${data.ollama.models[0]}`,
                        tts: data.currentConfig?.ttsProvider || 'not set',
                        isFullyLocal: true,
                    });
                } else {
                    showToast('Ollama running but no models installed. Run: ollama pull llama3.2', 'info');
                }
            }
            
            if (data.configured) {
                setStatus(prev => ({ ...prev, bolna: true }));
                setBolnaConfig(data.currentConfig);
                const localStatus = data.currentConfig?.isFullyLocal ? ' (Fully Local)' : '';
                showToast(`Bolna server configured${localStatus}!`, 'success');
            } else if (!data.ollama?.running) {
                showToast('Neither Bolna nor Ollama detected. Install Ollama from ollama.com', 'error');
            }
        } catch (error) {
            showToast('Failed to test Bolna connection', 'error');
        } finally {
            setTestingBolna(false);
        }
    };

    const checkClickToCallStatus = async () => {
        try {
            const res = await fetch('/api/click-to-call/config');
            const data = await res.json();
            setClickToCallConfig({
                isConfigured: data.configured,
                virtualNumber: data.virtualNumber,
                agentNumber: data.agentNumber,
            });
        } catch (error) {
            console.error('Failed to fetch click-to-call config:', error);
        }
    };

    const handleTestClickToCall = async () => {
        setTestingClickToCall(true);
        try {
            const res = await fetch('/api/click-to-call/config');
            const data = await res.json();
            setClickToCallConfig({
                isConfigured: data.configured,
                virtualNumber: data.virtualNumber,
                agentNumber: data.agentNumber,
            });
            if (data.configured) {
                showToast('Click-to-Call is configured and ready!', 'success');
            } else {
                showToast('Click-to-Call not configured. Add TATA_API_KEY and TATA_VIRTUAL_NUMBER to .env', 'error');
            }
        } catch (error) {
            showToast('Failed to test Click-to-Call configuration', 'error');
        } finally {
            setTestingClickToCall(false);
        }
    };

    const checkStatus = async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        try {
            const res = await fetch('/api/integrations/google-sheets/check-status');
            const data = await res.json();
            setStatus(prev => ({
                ...prev,
                googleSheets: data.connected || false,
                blandAi: data.blandConfigured || false,
                sheetId: data.sheetId
            }));
            if (showRefresh) showToast('Status refreshed successfully', 'info');
        } catch (error) {
            console.error('Failed to check status:', error);
            if (showRefresh) showToast('Failed to refresh status', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await fetch('/api/integrations/google-sheets/sync', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setLastSyncTime(new Date());
                showToast(`✨ Sync complete! ${data.results?.length || 0} rows processed`, 'success');
            } else {
                showToast(`Sync failed: ${data.error}`, 'error');
            }
        } catch (error) {
            showToast('Sync failed. Check console for details.', 'error');
            console.error(error);
        } finally {
            setSyncing(false);
        }
    };

    const handleTestBland = async () => {
        setTestingBland(true);
        try {
            const res = await fetch('/api/integrations/google-sheets/check-status');
            const data = await res.json();
            if (data.blandConfigured) {
                showToast('Bland AI is configured and ready!', 'success');
            } else {
                showToast('Bland AI not configured. Add BLAND_API_KEY to .env', 'error');
            }
        } catch (error) {
            showToast('Failed to test Bland AI connection', 'error');
        } finally {
            setTestingBland(false);
        }
    };

    const connectedCount = [status.googleSheets, status.blandAi, status.elevenLabs, status.bolna, isClickToCallConfigured].filter(Boolean).length;

    if (loading) {
        return (
            <Layout>
                <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Link2 className="w-6 h-6 text-primary animate-pulse" />
                        </div>
                    </div>
                    <p className="text-muted-foreground animate-pulse">Checking integrations...</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            {/* Toast Notifications */}
            <div className="fixed top-4 right-4 z-50 space-y-2">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`px-4 py-3 rounded-xl shadow-lg backdrop-blur-md border animate-in slide-in-from-right-5 duration-300 flex items-center gap-3 min-w-[280px] ${
                            toast.type === 'success' 
                                ? 'bg-green-500/90 text-white border-green-400/50' 
                                : toast.type === 'error'
                                ? 'bg-red-500/90 text-white border-red-400/50'
                                : 'bg-blue-500/90 text-white border-blue-400/50'
                        }`}
                    >
                        {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                        {toast.type === 'error' && <XCircle className="w-5 h-5" />}
                        {toast.type === 'info' && <Sparkles className="w-5 h-5" />}
                        <span className="font-medium text-sm">{toast.message}</span>
                    </div>
                ))}
            </div>

            <div className="space-y-8">
                {/* Hero Section */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-8 md:p-10">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZ2LTRoLTJ2NGgyem0tNiA2aC00djJoNHYtMnptLTYgMGgtNHYyaDR2LTJ6bTEyLTEydi00aC0ydjRoMnptLTYgMGgtNHYyaDR2LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                                    <Link2 className="w-6 h-6 text-white" />
                                </div>
                                <span className="px-3 py-1 bg-white/20 rounded-full text-white/90 text-xs font-semibold backdrop-blur-sm">
                                    {connectedCount}/2 Connected
                                </span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
                                Integrations Hub
                            </h1>
                            <p className="text-white/80 text-lg max-w-md">
                                Connect your favorite tools and automate your AI voice calling workflow
                            </p>
                        </div>
                        
                        <div className="flex gap-2">
                            <Button3D
                                onClick={() => isAutoSyncing ? stopAutoSync() : startAutoSync()}
                                variant={isAutoSyncing ? "warning" : "success"}
                            >
                                <Power className={`w-4 h-4 ${isAutoSyncing ? 'animate-pulse' : ''}`} />
                                {isAutoSyncing ? 'Auto-Sync ON' : 'Auto-Sync'}
                            </Button3D>
                            <Button3D
                                onClick={() => checkStatus(true)}
                                disabled={refreshing}
                                variant="secondary"
                            >
                                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                                {refreshing ? 'Checking...' : 'Refresh'}
                            </Button3D>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="relative z-10 grid grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/20">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-white">{connectedCount}</div>
                            <div className="text-white/60 text-sm">Active</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-white">5</div>
                            <div className="text-white/60 text-sm">Available</div>
                        </div>
                        <div className="text-center">
                            <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${isAutoSyncing ? 'text-green-300' : 'text-white'}`}>
                                {isAutoSyncing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />}
                            </div>
                            <div className="text-white/60 text-sm">{isAutoSyncing ? 'Syncing' : 'Healthy'}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-sm font-bold text-white">
                                {lastSyncTime ? lastSyncTime.toLocaleTimeString() : '--:--'}
                            </div>
                            <div className="text-white/60 text-sm">Last Sync</div>
                        </div>
                    </div>
                </div>

                {/* Default AI Caller Provider Selector */}
                <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5 p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                                <Mic className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-foreground">Default AI Voice Provider</h3>
                                <p className="text-sm text-muted-foreground">Choose which AI will make calls when you click "AI Call"</p>
                            </div>
                        </div>
                        
                        <div className="flex gap-2">
                            {availableProviders.map((provider) => (
                                <button
                                    key={provider.id}
                                    onClick={() => handleProviderChange(provider.id)}
                                    disabled={savingProvider || !provider.configured}
                                    className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                                        defaultProvider === provider.id
                                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                                            : provider.configured
                                            ? 'bg-secondary hover:bg-secondary/80 text-foreground'
                                            : 'bg-secondary/50 text-muted-foreground cursor-not-allowed'
                                    }`}
                                >
                                    {defaultProvider === provider.id && <Check className="w-4 h-4" />}
                                    {provider.name}
                                    {!provider.configured && <span className="text-xs opacity-60">(Not configured)</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Integration Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Google Sheets Card */}
                    <div className={`group relative overflow-hidden rounded-2xl border transition-all duration-500 hover:shadow-2xl ${
                        status.googleSheets 
                            ? 'border-green-500/30 hover:border-green-500/50 bg-gradient-to-br from-green-500/5 to-emerald-500/5' 
                            : 'border-border hover:border-yellow-500/50 bg-card'
                    }`}>
                        {/* Glow effect */}
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                            status.googleSheets ? 'bg-green-500/5' : 'bg-yellow-500/5'
                        }`}></div>
                        
                        <div className="relative p-6">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110 ${
                                        status.googleSheets 
                                            ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30' 
                                            : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700'
                                    }`}>
                                        <Database className={`w-7 h-7 ${status.googleSheets ? 'text-white' : 'text-muted-foreground'}`} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-foreground">Google Sheets</h3>
                                        <p className="text-sm text-muted-foreground">Data Sync</p>
                                    </div>
                                </div>
                                
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                                    status.googleSheets 
                                        ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                                        : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                                }`}>
                                    <div className={`w-2 h-2 rounded-full ${
                                        status.googleSheets ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
                                    }`}></div>
                                    {status.googleSheets ? 'Connected' : 'Setup Required'}
                                </div>
                            </div>

                            <p className="text-muted-foreground mb-4 leading-relaxed">
                                Automatically sync driver data and call results with your Google Sheet. Import contacts and export call transcripts in real-time.
                            </p>

                            {status.sheetId && (
                                <div className="mb-4 p-3 bg-secondary/50 rounded-xl border border-border">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                        <Shield className="w-3 h-3" />
                                        Connected Sheet
                                    </div>
                                    <code className="text-xs font-mono text-foreground">
                                        {status.sheetId.substring(0, 25)}...
                                    </code>
                                </div>
                            )}

                            {/* Features */}
                            <div className="grid grid-cols-2 gap-2 mb-6">
                                {['Auto Import', 'Real-time Sync', 'Transcript Export', 'Status Updates'].map((feature) => (
                                    <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        {feature}
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <Button3D
                                        onClick={handleSync}
                                        disabled={syncing || !status.googleSheets}
                                        variant="success"
                                        fullWidth
                                    >
                                        {syncing ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                Syncing...
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="w-4 h-4" />
                                                Sync Now
                                            </>
                                        )}
                                    </Button3D>
                                </div>
                                <Button3D variant="secondary" iconOnly>
                                    <Settings className="w-5 h-5" />
                                </Button3D>
                            </div>
                        </div>
                    </div>

                    {/* Bland AI Card */}
                    <div className={`group relative overflow-hidden rounded-2xl border transition-all duration-500 hover:shadow-2xl ${
                        status.blandAi 
                            ? 'border-blue-500/30 hover:border-blue-500/50 bg-gradient-to-br from-blue-500/5 to-indigo-500/5' 
                            : 'border-border hover:border-yellow-500/50 bg-card'
                    }`}>
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                            status.blandAi ? 'bg-blue-500/5' : 'bg-yellow-500/5'
                        }`}></div>
                        
                        <div className="relative p-6">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110 ${
                                        status.blandAi 
                                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30' 
                                            : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700'
                                    }`}>
                                        <Phone className={`w-7 h-7 ${status.blandAi ? 'text-white' : 'text-muted-foreground'}`} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-foreground">Bland AI</h3>
                                        <p className="text-sm text-muted-foreground">Voice Calling</p>
                                    </div>
                                </div>
                                
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                                    status.blandAi 
                                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                                        : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                                }`}>
                                    <div className={`w-2 h-2 rounded-full ${
                                        status.blandAi ? 'bg-blue-500 animate-pulse' : 'bg-yellow-500'
                                    }`}></div>
                                    {status.blandAi ? 'Connected' : 'Setup Required'}
                                </div>
                            </div>

                            <p className="text-muted-foreground mb-4 leading-relaxed">
                                AI-powered phone calling API for automated voice conversations. Make intelligent calls with natural language processing.
                            </p>

                            {status.blandAi && (
                                <div className="mb-4 p-3 bg-secondary/50 rounded-xl border border-border">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                        <Shield className="w-3 h-3" />
                                        API Status
                                    </div>
                                    <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                                        ● API Key Configured
                                    </span>
                                </div>
                            )}

                            {/* Features */}
                            <div className="grid grid-cols-2 gap-2 mb-6">
                                {['AI Voice Calls', 'Hindi Support', 'Transcription', 'Call Recording'].map((feature) => (
                                    <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <CheckCircle2 className="w-4 h-4 text-blue-500" />
                                        {feature}
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <Button3D
                                        onClick={handleTestBland}
                                        disabled={testingBland}
                                        variant={status.blandAi ? "primary" : "warning"}
                                        fullWidth
                                    >
                                        {testingBland ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                Testing...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4" />
                                                {status.blandAi ? 'Test Connection' : 'Setup Now'}
                                            </>
                                        )}
                                    </Button3D>
                                </div>
                                <Button3D variant="secondary" iconOnly>
                                    <Settings className="w-5 h-5" />
                                </Button3D>
                            </div>
                        </div>
                    </div>

                    {/* ElevenLabs Card */}
                    <div className={`group relative overflow-hidden rounded-2xl border transition-all duration-500 hover:shadow-2xl ${
                        status.elevenLabs 
                            ? 'border-amber-500/30 hover:border-amber-500/50 bg-gradient-to-br from-amber-500/5 to-orange-500/5' 
                            : 'border-border hover:border-yellow-500/50 bg-card'
                    }`}>
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                            status.elevenLabs ? 'bg-amber-500/5' : 'bg-yellow-500/5'
                        }`}></div>
                        
                        <div className="relative p-6">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110 ${
                                        status.elevenLabs 
                                            ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30' 
                                            : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700'
                                    }`}>
                                        <Volume2 className={`w-7 h-7 ${status.elevenLabs ? 'text-white' : 'text-muted-foreground'}`} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-foreground">ElevenLabs</h3>
                                        <p className="text-sm text-muted-foreground">AI Voice Synthesis</p>
                                    </div>
                                </div>
                                
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                                    status.elevenLabs 
                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' 
                                        : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                                }`}>
                                    <div className={`w-2 h-2 rounded-full ${
                                        status.elevenLabs ? 'bg-amber-500 animate-pulse' : 'bg-yellow-500'
                                    }`}></div>
                                    {status.elevenLabs ? 'Connected' : 'Setup Required'}
                                </div>
                            </div>

                            <p className="text-muted-foreground mb-4 leading-relaxed">
                                Premium AI voices with ultra-realistic speech synthesis. Perfect for natural-sounding phone calls with multi-language support.
                            </p>

                            {status.elevenLabs && (
                                <div className="mb-4 p-3 bg-secondary/50 rounded-xl border border-border">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                        <Shield className="w-3 h-3" />
                                        API Status
                                    </div>
                                    <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                                        ● API Key & Agent Configured
                                    </span>
                                </div>
                            )}

                            {/* Features */}
                            <div className="grid grid-cols-2 gap-2 mb-6">
                                {['Premium Voices', 'Multi-language', 'Low Latency', 'Emotion Control'].map((feature) => (
                                    <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <CheckCircle2 className="w-4 h-4 text-amber-500" />
                                        {feature}
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <Button3D
                                        onClick={handleTestElevenLabs}
                                        disabled={testingElevenLabs}
                                        variant={status.elevenLabs ? "primary" : "warning"}
                                        fullWidth
                                    >
                                        {testingElevenLabs ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                Testing...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4" />
                                                {status.elevenLabs ? 'Test Connection' : 'Setup Now'}
                                            </>
                                        )}
                                    </Button3D>
                                </div>
                                <Button3D variant="secondary" iconOnly>
                                    <Settings className="w-5 h-5" />
                                </Button3D>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bolna Local AI Card (Full Width) */}
                <div className={`group relative overflow-hidden rounded-2xl border transition-all duration-500 hover:shadow-2xl ${
                    status.bolna 
                        ? 'border-cyan-500/30 hover:border-cyan-500/50 bg-gradient-to-br from-cyan-500/5 to-teal-500/5' 
                        : 'border-border hover:border-yellow-500/50 bg-card'
                }`}>
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                        status.bolna ? 'bg-cyan-500/5' : 'bg-yellow-500/5'
                    }`}></div>
                    
                    <div className="relative p-6">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                            <div className="flex items-start gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110 ${
                                    status.bolna 
                                        ? 'bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg shadow-cyan-500/30' 
                                        : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700'
                                }`}>
                                    <Cpu className={`w-7 h-7 ${status.bolna ? 'text-white' : 'text-muted-foreground'}`} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-xl font-bold text-foreground">Bolna - Local AI</h3>
                                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                                            status.bolna 
                                                ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' 
                                                : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                                        }`}>
                                            <div className={`w-2 h-2 rounded-full ${
                                                status.bolna ? 'bg-cyan-500 animate-pulse' : 'bg-yellow-500'
                                            }`}></div>
                                            {status.bolna ? 'Connected' : 'Setup Required'}
                                        </div>
                                        {bolnaConfig?.isFullyLocal && (
                                            <span className="px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-semibold rounded-full">
                                                100% Local
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">Self-hosted Voice AI - Train Your Own Models</p>
                                </div>
                            </div>
                            
                            <div className="flex gap-3">
                                <Button3D
                                    onClick={handleTestBolna}
                                    disabled={testingBolna}
                                    variant={status.bolna ? "primary" : "warning"}
                                >
                                    {testingBolna ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Testing...
                                        </>
                                    ) : (
                                        <>
                                            <Server className="w-4 h-4" />
                                            {status.bolna ? 'Test Connection' : 'Setup Now'}
                                        </>
                                    )}
                                </Button3D>
                                <Button3D variant="secondary" iconOnly>
                                    <Settings className="w-5 h-5" />
                                </Button3D>
                            </div>
                        </div>

                        <div className="mt-6 grid md:grid-cols-2 gap-6">
                            <div>
                                <p className="text-muted-foreground mb-4 leading-relaxed">
                                    Run AI voice agents entirely on your own hardware. Use local LLMs (Ollama), local TTS (XTTS), 
                                    and customize models for your specific use case. No per-call API costs.
                                </p>

                                {status.bolna && bolnaConfig && (
                                    <div className="space-y-2 mb-4">
                                        <div className="p-3 bg-secondary/50 rounded-xl border border-border">
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                                <Cpu className="w-3 h-3" />
                                                Current Configuration
                                            </div>
                                            <div className="text-xs space-y-1">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">LLM:</span>
                                                    <span className="font-semibold text-foreground">{bolnaConfig.llm || 'Not set'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">TTS:</span>
                                                    <span className="font-semibold text-foreground">{bolnaConfig.tts || 'Not set'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                {/* Features */}
                                <div className="grid grid-cols-2 gap-2">
                                    {['Local LLMs (Ollama)', 'Local TTS (XTTS)', 'No API Costs', 'Custom Training'].map((feature) => (
                                        <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <CheckCircle2 className="w-4 h-4 text-cyan-500" />
                                            {feature}
                                        </div>
                                    ))}
                                    {['Hindi Support', 'Twilio/Plivo', 'Full Privacy', 'Open Source'].map((feature) => (
                                        <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <CheckCircle2 className="w-4 h-4 text-cyan-500" />
                                            {feature}
                                        </div>
                                    ))}
                                </div>

                                {!status.bolna && (
                                    <div className="mt-4 p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
                                        <p className="text-xs text-muted-foreground">
                                            <strong>Requirements:</strong> Docker, Ollama, XTTS server, Deepgram API key, Twilio/Plivo account
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Click-to-Call Card (Full Width) */}
                <div className={`group relative overflow-hidden rounded-2xl border transition-all duration-500 hover:shadow-2xl ${
                    isClickToCallConfigured 
                        ? 'border-purple-500/30 hover:border-purple-500/50 bg-gradient-to-br from-purple-500/5 to-pink-500/5' 
                        : 'border-border hover:border-yellow-500/50 bg-card'
                }`}>
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                        isClickToCallConfigured ? 'bg-purple-500/5' : 'bg-yellow-500/5'
                    }`}></div>
                    
                    <div className="relative p-6">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                            <div className="flex items-start gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110 ${
                                    isClickToCallConfigured 
                                        ? 'bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/30' 
                                        : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700'
                                }`}>
                                    <PhoneCall className={`w-7 h-7 ${isClickToCallConfigured ? 'text-white' : 'text-muted-foreground'}`} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-xl font-bold text-foreground">Tata Click-to-Call</h3>
                                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                                            isClickToCallConfigured 
                                                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' 
                                                : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                                        }`}>
                                            <div className={`w-2 h-2 rounded-full ${
                                                isClickToCallConfigured ? 'bg-purple-500 animate-pulse' : 'bg-yellow-500'
                                            }`}></div>
                                            {isClickToCallConfigured ? 'Connected' : 'Setup Required'}
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground">Manual Voice Calling via Virtual Number</p>
                                </div>
                            </div>
                            
                            <div className="flex gap-3">
                                <Button3D
                                    onClick={handleTestClickToCall}
                                    disabled={testingClickToCall}
                                    variant={isClickToCallConfigured ? "primary" : "warning"}
                                >
                                    {testingClickToCall ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Testing...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            {isClickToCallConfigured ? 'Test Connection' : 'Setup Now'}
                                        </>
                                    )}
                                </Button3D>
                                <Button3D variant="secondary" iconOnly>
                                    <Settings className="w-5 h-5" />
                                </Button3D>
                            </div>
                        </div>

                        <div className="mt-6 grid md:grid-cols-2 gap-6">
                            <div>
                                <p className="text-muted-foreground mb-4 leading-relaxed">
                                    Connect your Tata Communications virtual number for manual click-to-call functionality. 
                                    Call drivers directly from the CRM using your business number.
                                </p>

                                {isClickToCallConfigured && (
                                    <div className="space-y-2 mb-4">
                                        {virtualNumber && (
                                            <div className="p-3 bg-secondary/50 rounded-xl border border-border">
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                                    <Phone className="w-3 h-3" />
                                                    Virtual Number
                                                </div>
                                                <code className="text-sm font-mono text-foreground">{virtualNumber}</code>
                                            </div>
                                        )}
                                        {agentNumber && (
                                            <div className="p-3 bg-secondary/50 rounded-xl border border-border">
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                                    <Headphones className="w-3 h-3" />
                                                    Agent Number
                                                </div>
                                                <code className="text-sm font-mono text-foreground">{agentNumber}</code>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div>
                                {/* Features */}
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    {['Click-to-Call', 'Virtual Number', 'Call Recording', 'Call Analytics', 'Webhook Events', 'Agent Connect'].map((feature) => (
                                        <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <CheckCircle2 className="w-4 h-4 text-purple-500" />
                                            {feature}
                                        </div>
                                    ))}
                                </div>

                                {/* Setup Steps */}
                                <div className="p-4 bg-secondary/30 rounded-xl">
                                    <h4 className="text-sm font-bold text-foreground mb-2">Quick Setup</h4>
                                    <div className="space-y-2 text-xs text-muted-foreground">
                                        <div className="flex items-start gap-2">
                                            <span className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-600 font-bold">1</span>
                                            <span>Get virtual number from Tata Communications</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-600 font-bold">2</span>
                                            <span>Add TATA_API_KEY, TATA_VIRTUAL_NUMBER to .env</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-600 font-bold">3</span>
                                            <span>Configure webhook URL in Tata dashboard</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Setup Guide */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                    <div className="p-6 border-b border-border bg-gradient-to-r from-secondary/50 to-transparent">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <Settings className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-foreground">Quick Setup Guide</h3>
                                <p className="text-sm text-muted-foreground">Get your integrations running in minutes</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                                    <Database className="w-4 h-4 text-green-600" />
                                </div>
                                <h4 className="font-semibold text-foreground">Google Sheets</h4>
                            </div>
                            <div className="space-y-3">
                                {[
                                    'Create a Google Cloud project',
                                    'Enable Google Sheets API',
                                    'Create Service Account & download key',
                                    'Add credentials to .env file',
                                    'Share sheet with service account email'
                                ].map((step, i) => (
                                    <div key={i} className="flex items-start gap-3 group">
                                        <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground group-hover:bg-green-500 group-hover:text-white transition-colors">
                                            {i + 1}
                                        </span>
                                        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                                            {step}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <a 
                                href="https://console.cloud.google.com" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-green-600 hover:text-green-700 transition-colors"
                            >
                                Open Google Cloud Console
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                        
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <Phone className="w-4 h-4 text-blue-600" />
                                </div>
                                <h4 className="font-semibold text-foreground">Bland AI</h4>
                            </div>
                            <div className="space-y-3">
                                {[
                                    'Sign up at bland.ai',
                                    'Navigate to API settings',
                                    'Generate a new API key',
                                    'Add BLAND_API_KEY to .env',
                                    'Test connection above'
                                ].map((step, i) => (
                                    <div key={i} className="flex items-start gap-3 group">
                                        <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                            {i + 1}
                                        </span>
                                        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                                            {step}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <a 
                                href="https://bland.ai" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                            >
                                Visit Bland AI
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
