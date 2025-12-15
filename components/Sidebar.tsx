"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSyncStore } from '@/lib/store';
import {
    LayoutDashboard,
    Users,
    Phone,
    History,
    Wrench,
    Puzzle,
    Bell,
    Zap,
    UserCircle,
    ChevronDown,
    Home,
    Bot,
    PhoneCall,
    Settings,
    LogOut,
    HelpCircle,
    Sparkles,
    RefreshCw,
    Play
} from 'lucide-react';

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [showUserMenu, setShowUserMenu] = useState(false);
    
    // Global sync state
    const { isAutoSyncing, isSyncing, isAutoDialing, selectedDriverIds } = useSyncStore();

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const sections = [
        {
            title: 'Build',
            items: [
                { href: '/agents', label: 'AI Agents', icon: Bot, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
            ]
        },
        {
            title: 'Manage',
            items: [
                { href: '/drivers', label: 'Drivers', icon: Users, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
                { href: '/calls', label: 'Call History', icon: PhoneCall, color: 'text-green-500', bgColor: 'bg-green-500/10' },
            ]
        },
        {
            title: 'Connect',
            items: [
                { href: '/integrations', label: 'Integrations', icon: Puzzle, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
            ]
        },
        {
            title: 'System',
            items: [
                { href: '/settings', label: 'Settings', icon: Settings, color: 'text-gray-500', bgColor: 'bg-gray-500/10' },
            ]
        }
    ];

    return (
        <div className="w-64 bg-card border-r border-border flex flex-col h-screen sticky top-0 z-50 text-muted-foreground font-sans text-sm transition-colors duration-300">
            {/* Header / Brand */}
            <div className="p-4 border-b border-border">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30">
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <span className="font-bold text-foreground block">AI Voice Agent</span>
                        <span className="text-xs text-muted-foreground">Recruitment Platform</span>
                    </div>
                </div>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-thin scrollbar-thumb-secondary scrollbar-track-transparent">

                {/* Home Link */}
                <div>
                    <Link
                        href="/"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${pathname === '/'
                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                            : 'hover:bg-secondary/70 text-muted-foreground hover:text-foreground'}`}
                    >
                        <div className={`p-1.5 rounded-lg ${pathname === '/' ? 'bg-white/20' : 'bg-primary/10 group-hover:bg-primary/20'}`}>
                            <Home className={`w-4 h-4 ${pathname === '/' ? 'text-white' : 'text-primary'}`} />
                        </div>
                        <span className="font-medium">Dashboard</span>
                        {pathname === '/' && <Sparkles className="w-3 h-3 ml-auto animate-pulse" />}
                    </Link>
                </div>

                {sections.map((section, idx) => (
                    <div key={idx}>
                        <h3 className="px-3 mb-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{section.title}</h3>
                        <div className="space-y-1">
                            {section.items.map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${isActive
                                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                                            : 'hover:bg-secondary/70 text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-white/20' : `${item.bgColor} group-hover:scale-105`}`}>
                                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.color}`} />
                                        </div>
                                        <span className="font-medium">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Active Processes Indicator */}
            {(isAutoSyncing || isAutoDialing) && (
                <div className="mx-3 mb-2 p-3 rounded-xl bg-gradient-to-r from-primary/10 to-violet-500/10 border border-primary/20">
                    <div className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Active Processes
                    </div>
                    <div className="space-y-1.5">
                        {isAutoSyncing && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <RefreshCw className="w-3 h-3 animate-spin text-primary" />
                                <span>Auto-Sync Running</span>
                            </div>
                        )}
                        {isAutoDialing && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Play className="w-3 h-3 text-green-500 animate-pulse" />
                                <span>Auto-Dialer ({selectedDriverIds.size} queued)</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Footer Actions */}
            <div className="p-3 border-t border-border space-y-2">
                {/* Upgrade Button */}
                <button className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:via-orange-600 hover:to-red-600 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02]">
                    <Zap className="w-4 h-4" />
                    Upgrade to Pro
                </button>

                {/* Help */}
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors text-left">
                    <HelpCircle className="w-4 h-4" />
                    <span>Help & Support</span>
                </button>

                {/* User Profile */}
                <div className="relative">
                    <button 
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="w-full flex items-center justify-between px-2 py-2 rounded-xl hover:bg-secondary/50 transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 border border-border flex items-center justify-center text-primary font-bold">
                                S
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Shuktij</div>
                                <div className="text-xs text-muted-foreground">Free Plan</div>
                            </div>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {/* User Dropdown Menu */}
                    {showUserMenu && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
                            <Link 
                                href="/settings" 
                                className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
                            >
                                <Settings className="w-4 h-4" />
                                <span>Settings</span>
                            </Link>
                            <button 
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 transition-colors text-red-500"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
