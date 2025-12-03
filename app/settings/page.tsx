"use client";

import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Moon, Sun, Monitor } from 'lucide-react';

export default function SettingsPage() {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'dark' | 'light';
        if (savedTheme) {
            setTheme(savedTheme);
        } else {
            // Default to dark
            setTheme('dark');
        }
    }, []);

    const handleThemeChange = (newTheme: 'dark' | 'light') => {
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);

        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    return (
        <Layout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Settings</h1>
                    <p className="text-muted-foreground mt-1">Manage your preferences and workspace settings</p>
                </div>

                <div className="glass-card p-8 rounded-2xl border border-border">
                    <h2 className="text-xl font-semibold text-foreground mb-6">Appearance</h2>

                    <div className="space-y-4">
                        <label className="text-sm font-medium text-muted-foreground block">Theme Preference</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
                            <button
                                onClick={() => handleThemeChange('light')}
                                className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${theme === 'light'
                                        ? 'bg-primary/10 border-primary text-primary ring-2 ring-primary/20'
                                        : 'bg-secondary/50 border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                                    }`}
                            >
                                <Sun className="w-6 h-6" />
                                <span className="font-medium">Light Mode</span>
                            </button>

                            <button
                                onClick={() => handleThemeChange('dark')}
                                className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${theme === 'dark'
                                        ? 'bg-primary/10 border-primary text-primary ring-2 ring-primary/20'
                                        : 'bg-secondary/50 border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                                    }`}
                            >
                                <Moon className="w-6 h-6" />
                                <span className="font-medium">Dark Mode</span>
                            </button>

                            <button
                                disabled
                                className="p-4 rounded-xl border border-border bg-secondary/20 text-muted-foreground/50 flex flex-col items-center gap-3 cursor-not-allowed opacity-50"
                            >
                                <Monitor className="w-6 h-6" />
                                <span className="font-medium">System (Coming Soon)</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
