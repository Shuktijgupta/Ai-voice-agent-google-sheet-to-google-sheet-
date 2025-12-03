"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

const integrations = [
    {
        id: 'google-sheets',
        name: 'Google Sheets',
        description: 'Sync drivers and call status with Google Sheets.',
        connected: true, // In a real app, check env vars or DB
        icon: '📊'
    },
    {
        id: 'bland-ai',
        name: 'Bland AI',
        description: 'AI Phone Calling API.',
        connected: true,
        icon: '📞'
    },

];

export default function IntegrationsPage() {
    return (
        <Layout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Integrations</h1>
                    <p className="text-muted-foreground mt-1">Manage your connected services and APIs</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {integrations.map((integration) => (
                        <div key={integration.id} className="glass-card p-6 rounded-2xl border border-border flex flex-col justify-between hover:border-primary/50 transition-colors group">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="text-4xl">{integration.icon}</div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 ${integration.connected
                                        ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                                        }`}>
                                        {integration.connected ? (
                                            <>
                                                <CheckCircle2 className="w-3 h-3" />
                                                Connected
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="w-3 h-3" />
                                                Disconnected
                                            </>
                                        )}
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold text-foreground mb-2">{integration.name}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{integration.description}</p>
                            </div>

                            <div className="mt-6 pt-6 border-t border-border">
                                <button className="w-full py-2 px-4 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium transition-colors flex items-center justify-center gap-2">
                                    Manage
                                    <ExternalLink className="w-3 h-3 opacity-50" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Layout>
    );
}
