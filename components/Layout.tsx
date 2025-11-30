"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { useRouter } from 'next/navigation';
import { Sun, Moon, LogOut } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
    const [darkMode, setDarkMode] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const isDark = localStorage.getItem('darkMode') === 'true';
        setDarkMode(isDark);
    }, []);

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('darkMode', 'true');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('darkMode', 'false');
        }
    }, [darkMode]);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
    };

    return (
        <div className="flex min-h-screen bg-background transition-colors duration-300">
            <Sidebar />
            <div className="flex-1 flex flex-col relative overflow-hidden">
                {/* Background decorative elements */}
                <div className="absolute top-0 left-0 w-full h-96 bg-primary/5 -z-10 blur-3xl rounded-b-[50%]"></div>
                <div className="absolute top-20 right-20 w-72 h-72 bg-purple-500/5 -z-10 blur-3xl rounded-full"></div>

                {/* Header */}
                <header className="h-20 flex items-center justify-end px-8 sticky top-0 z-40 backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className="p-2.5 rounded-full bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/50 text-muted-foreground hover:text-primary hover:bg-white dark:hover:bg-gray-800 transition-all shadow-sm backdrop-blur-md"
                        >
                            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/50 text-sm font-medium text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all shadow-sm backdrop-blur-md"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 px-8 pb-8 overflow-y-auto">
                    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
