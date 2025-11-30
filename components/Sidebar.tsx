"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Phone, History } from 'lucide-react';

export default function Sidebar() {
    const pathname = usePathname();

    const links = [
        { href: '/', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/agents', label: 'AI Agents', icon: Users },
        { href: '/calls', label: 'Call History', icon: History },
    ];

    return (
        <div className="w-64 bg-background/80 backdrop-blur-xl border-r border-border flex flex-col h-screen sticky top-0 z-50 transition-all duration-300">
            <div className="p-6 border-b border-border/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/25">
                        <Phone className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-xl tracking-tight text-foreground">AutoCaller</h1>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">Pro Edition</span>
                    </div>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {links.map((link) => {
                    const isActive = pathname === link.href;
                    const Icon = link.icon;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${isActive
                                ? 'bg-gradient-to-r from-primary/10 to-purple-500/10 text-primary font-semibold shadow-sm border border-primary/10'
                                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                                }`}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"></div>
                            )}
                            <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                            <span className="relative z-10">{link.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-border/50 bg-secondary/10">
                <div className="p-4 rounded-xl bg-gradient-to-br from-gray-900 to-black border border-white/10 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-primary/20 blur-2xl rounded-full -mr-10 -mt-10 transition-all group-hover:bg-primary/30"></div>
                    <h3 className="text-white font-semibold mb-1 relative z-10">System Status</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400 relative z-10">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                        All systems operational
                    </div>
                </div>
            </div>
        </div>
    );
}
