"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    Phone,
    History,
    BookOpen,
    Wrench,
    Mic2,
    MessageSquare,
    TestTube2,
    Puzzle,
    Smartphone,
    PhoneOutgoing,
    Code2,
    Bell,
    Zap,
    UserCircle,
    ChevronDown,
    Home
} from 'lucide-react';

export default function Sidebar() {
    const pathname = usePathname();

    const sections = [
        {
            title: 'Build',
            items: [
                { href: '/agents', label: 'Agents', icon: Users },
            ]
        },
        {
            title: 'Evaluate',
            items: [
                { href: '/drivers', label: 'Drivers', icon: Users },
                { href: '/calls', label: 'Call History', icon: History },
            ]
        },
        {
            title: 'Connect',
            items: [
                { href: '/integrations', label: 'Integrations', icon: Puzzle },
            ]
        },
        {
            title: 'System',
            items: [
                { href: '/settings', label: 'Settings', icon: Wrench },
            ]
        }
    ];

    return (
        <div className="w-64 bg-card border-r border-border flex flex-col h-screen sticky top-0 z-50 text-muted-foreground font-sans text-sm transition-colors duration-300">
            {/* Header / Platform Switcher */}
            <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors border border-transparent hover:border-border group">
                    <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                            <Zap className="w-3 h-3 text-white fill-current" />
                        </div>
                        <span className="font-medium text-foreground group-hover:text-primary transition-colors">Agents Platform</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </div>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6 scrollbar-thin scrollbar-thumb-secondary scrollbar-track-transparent">

                {/* Home Link */}
                <div className="px-2">
                    <Link
                        href="/"
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${pathname === '/'
                            ? 'text-primary-foreground bg-primary'
                            : 'hover:text-foreground hover:bg-secondary/50'}`}
                    >
                        <Home className="w-4 h-4" />
                        <span>Home</span>
                    </Link>
                </div>

                {sections.map((section, idx) => (
                    <div key={idx} className="px-2">
                        <h3 className="px-3 mb-2 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">{section.title}</h3>
                        <div className="space-y-0.5">
                            {section.items.map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 group ${isActive
                                            ? 'text-primary-foreground bg-primary'
                                            : 'hover:text-foreground hover:bg-secondary/50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className={`w-4 h-4 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}`} />
                                            <span>{item.label}</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer Actions */}
            <div className="p-2 border-t border-border space-y-1">
                <Link href="/developers" className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                    <Code2 className="w-4 h-4" />
                    <span>Developers</span>
                </Link>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors text-left">
                    <Bell className="w-4 h-4" />
                    <span>Notifications</span>
                </button>

                <div className="px-2 py-2">
                    <button className="w-full py-2 px-3 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 border border-white/10 rounded-lg text-gray-200 text-sm font-medium flex items-center justify-center gap-2 transition-all group shadow-lg">
                        <Zap className="w-3.5 h-3.5 text-yellow-500 group-hover:text-yellow-400 fill-current" />
                        Upgrade
                    </button>
                </div>

                <div className="pt-1 pb-2 px-1">
                    <button className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-secondary/50 transition-colors group">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground">
                                <UserCircle className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Shuktij</div>
                                <div className="text-xs text-muted-foreground">My Workspace</div>
                            </div>
                        </div>
                        <ChevronDown className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
                    </button>
                </div>
            </div>
        </div>
    );
}
