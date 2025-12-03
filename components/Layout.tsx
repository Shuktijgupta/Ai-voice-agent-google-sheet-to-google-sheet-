"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize theme
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else if (savedTheme === 'light') {
            document.documentElement.classList.remove('dark');
        } else {
            // Default to dark if no preference
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
        setIsInitialized(true);
    }, []);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
    };

    if (!isInitialized) return null;

    return (
        <div className="flex min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 transition-colors duration-300">
            <Sidebar />
            <div className="flex-1 flex flex-col relative overflow-hidden bg-background">

                {/* Header */}
                <header className="h-16 flex items-center justify-between px-8 border-b border-border bg-background sticky top-0 z-40 transition-colors duration-300">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-semibold text-foreground">Settings</h2>
                    </div>
                    <div className="flex items-center gap-6">
                        <button className="px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors">
                            Profile
                        </button>
                        <button className="text-sm text-gray-400 hover:text-white transition-colors">
                            Workspace Invites
                        </button>
                        <button
                            onClick={handleLogout}
                            className="text-sm text-gray-400 hover:text-red-400 transition-colors flex items-center gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-7xl mx-auto p-8 animate-in fade-in duration-500">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
