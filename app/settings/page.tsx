"use client";

import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { 
    Moon, Sun, Monitor, Bell, Shield, Key, Database, 
    Trash2, Download, Upload, RefreshCw, Check, X,
    Globe, Phone, User, Mail, Save, AlertTriangle,
    Zap, Volume2, Clock
} from 'lucide-react';

interface SettingsState {
    theme: 'dark' | 'light' | 'system';
    notifications: {
        callCompleted: boolean;
        callFailed: boolean;
        syncCompleted: boolean;
        dailyReport: boolean;
    };
    autoDialer: {
        delayBetweenCalls: number;
        maxConcurrentCalls: number;
        retryFailedCalls: boolean;
    };
    defaultCountryCode: string;
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<SettingsState>({
        theme: 'dark',
        notifications: {
            callCompleted: true,
            callFailed: true,
            syncCompleted: true,
            dailyReport: false
        },
        autoDialer: {
            delayBetweenCalls: 5,
            maxConcurrentCalls: 1,
            retryFailedCalls: false
        },
        defaultCountryCode: '+91'
    });
    const [saved, setSaved] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        // Load settings from localStorage
        const savedSettings = localStorage.getItem('appSettings');
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                setSettings(prev => ({ ...prev, ...parsed }));
            } catch (e) {
                console.error('Failed to parse settings');
            }
        }

        // Apply theme
        const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
        if (savedTheme) {
            setSettings(prev => ({ ...prev, theme: savedTheme }));
        }
    }, []);

    const handleThemeChange = (newTheme: 'dark' | 'light' | 'system') => {
        setSettings(prev => ({ ...prev, theme: newTheme }));
        
        if (newTheme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        } else if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        
        localStorage.setItem('theme', newTheme);
    };

    const handleSave = () => {
        localStorage.setItem('appSettings', JSON.stringify(settings));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleClearData = async () => {
        if (!confirm('Are you sure you want to clear all local data? This will not affect your database.')) return;
        
        setClearing(true);
        try {
            localStorage.clear();
            sessionStorage.clear();
            setTimeout(() => {
                setClearing(false);
                window.location.reload();
            }, 1000);
        } catch (e) {
            setClearing(false);
        }
    };

    const handleExportData = async () => {
        setExporting(true);
        try {
            // Fetch all data
            const [driversRes, callsRes] = await Promise.all([
                fetch('/api/drivers'),
                fetch('/api/calls')
            ]);
            
            const drivers = await driversRes.json();
            const calls = await callsRes.json();
            
            const exportData = {
                exportDate: new Date().toISOString(),
                drivers,
                calls,
                settings
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `ai-voice-agent-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error('Export failed:', e);
        } finally {
            setExporting(false);
        }
    };

    return (
        <Layout>
            <div className="space-y-8 max-w-4xl">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground tracking-tight">Settings</h1>
                        <p className="text-muted-foreground mt-1">Manage your preferences and workspace settings</p>
                    </div>
                    <button
                        onClick={handleSave}
                        className={`px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                            saved 
                                ? 'bg-green-500 text-white' 
                                : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25'
                        }`}
                    >
                        {saved ? (
                            <>
                                <Check className="w-4 h-4" />
                                Saved!
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>

                {/* Appearance */}
                <div className="glass-card p-6 rounded-2xl border border-border">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Sun className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">Appearance</h2>
                            <p className="text-sm text-muted-foreground">Customize how the app looks</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-sm font-medium text-muted-foreground block">Theme Preference</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button
                                onClick={() => handleThemeChange('light')}
                                className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${
                                    settings.theme === 'light'
                                        ? 'bg-primary/10 border-primary text-primary ring-2 ring-primary/20'
                                        : 'bg-secondary/50 border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                                }`}
                            >
                                <Sun className="w-6 h-6" />
                                <span className="font-medium">Light Mode</span>
                            </button>

                            <button
                                onClick={() => handleThemeChange('dark')}
                                className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${
                                    settings.theme === 'dark'
                                        ? 'bg-primary/10 border-primary text-primary ring-2 ring-primary/20'
                                        : 'bg-secondary/50 border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                                }`}
                            >
                                <Moon className="w-6 h-6" />
                                <span className="font-medium">Dark Mode</span>
                            </button>

                            <button
                                onClick={() => handleThemeChange('system')}
                                className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${
                                    settings.theme === 'system'
                                        ? 'bg-primary/10 border-primary text-primary ring-2 ring-primary/20'
                                        : 'bg-secondary/50 border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                                }`}
                            >
                                <Monitor className="w-6 h-6" />
                                <span className="font-medium">System</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Auto-Dialer Settings */}
                <div className="glass-card p-6 rounded-2xl border border-border">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-500/10 rounded-xl">
                            <Phone className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">Auto-Dialer Settings</h2>
                            <p className="text-sm text-muted-foreground">Configure automatic calling behavior</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">
                                Delay Between Calls (seconds)
                            </label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="range"
                                    min="3"
                                    max="30"
                                    value={settings.autoDialer.delayBetweenCalls}
                                    onChange={(e) => setSettings(prev => ({
                                        ...prev,
                                        autoDialer: { ...prev.autoDialer, delayBetweenCalls: parseInt(e.target.value) }
                                    }))}
                                    className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <span className="w-12 text-center font-mono text-foreground bg-secondary/50 px-2 py-1 rounded">
                                    {settings.autoDialer.delayBetweenCalls}s
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">
                                Default Country Code
                            </label>
                            <select
                                value={settings.defaultCountryCode}
                                onChange={(e) => setSettings(prev => ({ ...prev, defaultCountryCode: e.target.value }))}
                                className="w-full max-w-xs px-4 py-3 bg-secondary/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            >
                                <option value="+91">🇮🇳 India (+91)</option>
                                <option value="+1">🇺🇸 USA (+1)</option>
                                <option value="+44">🇬🇧 UK (+44)</option>
                                <option value="+971">🇦🇪 UAE (+971)</option>
                                <option value="+65">🇸🇬 Singapore (+65)</option>
                                <option value="+61">🇦🇺 Australia (+61)</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border">
                            <div>
                                <h3 className="font-medium text-foreground">Retry Failed Calls</h3>
                                <p className="text-sm text-muted-foreground">Automatically retry calls that failed or had no answer</p>
                            </div>
                            <button
                                onClick={() => setSettings(prev => ({
                                    ...prev,
                                    autoDialer: { ...prev.autoDialer, retryFailedCalls: !prev.autoDialer.retryFailedCalls }
                                }))}
                                className={`w-12 h-7 rounded-full transition-all ${
                                    settings.autoDialer.retryFailedCalls 
                                        ? 'bg-primary' 
                                        : 'bg-secondary'
                                }`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                                    settings.autoDialer.retryFailedCalls ? 'translate-x-6' : 'translate-x-1'
                                }`}></div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Notifications */}
                <div className="glass-card p-6 rounded-2xl border border-border">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-yellow-500/10 rounded-xl">
                            <Bell className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">Notifications</h2>
                            <p className="text-sm text-muted-foreground">Choose what updates you receive</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {[
                            { key: 'callCompleted', label: 'Call Completed', desc: 'Get notified when a call is successfully completed' },
                            { key: 'callFailed', label: 'Call Failed', desc: 'Get notified when a call fails or has no answer' },
                            { key: 'syncCompleted', label: 'Sync Completed', desc: 'Get notified when Google Sheets sync completes' },
                            { key: 'dailyReport', label: 'Daily Report', desc: 'Receive a daily summary of your calling activity' },
                        ].map((item) => (
                            <div key={item.key} className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border">
                                <div>
                                    <h3 className="font-medium text-foreground">{item.label}</h3>
                                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                                </div>
                                <button
                                    onClick={() => setSettings(prev => ({
                                        ...prev,
                                        notifications: { 
                                            ...prev.notifications, 
                                            [item.key]: !prev.notifications[item.key as keyof typeof prev.notifications] 
                                        }
                                    }))}
                                    className={`w-12 h-7 rounded-full transition-all ${
                                        settings.notifications[item.key as keyof typeof settings.notifications] 
                                            ? 'bg-primary' 
                                            : 'bg-secondary'
                                    }`}
                                >
                                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                                        settings.notifications[item.key as keyof typeof settings.notifications] ? 'translate-x-6' : 'translate-x-1'
                                    }`}></div>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Data Management */}
                <div className="glass-card p-6 rounded-2xl border border-border">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-green-500/10 rounded-xl">
                            <Database className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">Data Management</h2>
                            <p className="text-sm text-muted-foreground">Export, import, and manage your data</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={handleExportData}
                            disabled={exporting}
                            className="p-4 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 transition-all flex items-center gap-3 disabled:opacity-50"
                        >
                            {exporting ? (
                                <RefreshCw className="w-5 h-5 text-primary animate-spin" />
                            ) : (
                                <Download className="w-5 h-5 text-primary" />
                            )}
                            <div className="text-left">
                                <h3 className="font-medium text-foreground">Export All Data</h3>
                                <p className="text-sm text-muted-foreground">Download drivers, calls, and settings</p>
                            </div>
                        </button>

                        <button
                            onClick={handleClearData}
                            disabled={clearing}
                            className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 transition-all flex items-center gap-3 disabled:opacity-50"
                        >
                            {clearing ? (
                                <RefreshCw className="w-5 h-5 text-red-500 animate-spin" />
                            ) : (
                                <Trash2 className="w-5 h-5 text-red-500" />
                            )}
                            <div className="text-left">
                                <h3 className="font-medium text-red-600">Clear Local Data</h3>
                                <p className="text-sm text-muted-foreground">Reset local storage and cache</p>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="glass-card p-6 rounded-2xl border border-red-500/30 bg-red-500/5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-500/10 rounded-xl">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-red-600">Danger Zone</h2>
                            <p className="text-sm text-muted-foreground">Irreversible actions</p>
                        </div>
                    </div>

                    <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-foreground">Delete All Call History</h3>
                                <p className="text-sm text-muted-foreground">This will permanently delete all call records from the database</p>
                            </div>
                            <button 
                                onClick={() => alert('This feature requires admin confirmation. Contact support.')}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
                            >
                                Delete All
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
