"use client";

import React, { useState, useEffect } from 'react';
import { Bot, Plus, Trash2, XCircle, Sparkles, MessageSquare, Settings2 } from 'lucide-react';

export default function AgentsManager() {
    const [agents, setAgents] = useState<any[]>([]);
    const [showAgentModal, setShowAgentModal] = useState(false);
    const [newAgent, setNewAgent] = useState({ name: '', systemPrompt: '', questions: [{ id: 'q1', text: '' }] });
    const [loading, setLoading] = useState(true);

    const fetchAgents = async () => {
        try {
            const res = await fetch('/api/agents');
            const data = await res.json();
            if (Array.isArray(data)) {
                setAgents(data);
            } else {
                setAgents([]);
            }
        } catch (error) {
            console.error('Failed to fetch agents:', error);
            setAgents([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAgents();
    }, []);

    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createAgent = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        setError(null);
        try {
            const res = await fetch('/api/agents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAgent),
            });

            if (res.ok) {
                fetchAgents();
                setShowAgentModal(false);
                setNewAgent({ name: '', systemPrompt: '', questions: [{ id: 'q1', text: '' }] });
            } else {
                const data = await res.json();
                setError(data.details || data.error || 'Failed to create agent');
            }
        } catch (error) {
            console.error('Failed to create agent:', error);
            setError('Network error or server unreachable');
        } finally {
            setIsCreating(false);
        }
    };

    const deleteAgent = async (id: string) => {
        if (!confirm('Are you sure you want to delete this agent?')) return;
        try {
            await fetch(`/api/agents/${id}`, { method: 'DELETE' });
            fetchAgents();
        } catch (error) {
            console.error('Failed to delete agent:', error);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary animate-pulse" />
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 p-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">AI Agents</h1>
                    <p className="text-muted-foreground text-lg">Manage your AI recruiters and their personalities.</p>
                </div>
                <button
                    onClick={() => setShowAgentModal(true)}
                    className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 font-medium"
                >
                    <Plus className="w-5 h-5" /> Create New Agent
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map(agent => (
                    <div key={agent.id} className="group glass-card rounded-2xl p-6 flex flex-col justify-between hover:-translate-y-1 transition-all duration-300">
                        <div>
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3.5 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                                    <Bot className="w-6 h-6 text-primary" />
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => deleteAgent(agent.id)}
                                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Delete Agent"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-2">{agent.name}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-3 mb-6 leading-relaxed">
                                {agent.systemPrompt}
                            </p>
                        </div>
                        <div className="pt-4 border-t border-border flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full">
                                <MessageSquare className="w-3.5 h-3.5" />
                                {JSON.parse(agent.questions).length} Questions
                            </div>
                            <button className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                                Configure <Settings2 className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                ))}
                {agents.length === 0 && (
                    <div className="col-span-full text-center py-20 glass rounded-3xl border-2 border-dashed border-border">
                        <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Bot className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-2">No Agents Found</h3>
                        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                            Get started by creating your first AI recruiter. Define their personality and the questions they should ask.
                        </p>
                        <button
                            onClick={() => setShowAgentModal(true)}
                            className="px-6 py-3 bg-white dark:bg-gray-800 border border-border hover:border-primary/50 text-foreground rounded-xl font-medium transition-all hover:shadow-lg"
                        >
                            Create First Agent
                        </button>
                    </div>
                )}
            </div>

            {/* Agent Modal */}
            {showAgentModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-background rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-border flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-md z-10">
                            <div>
                                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-primary" />
                                    Create New Agent
                                </h3>
                                <p className="text-sm text-muted-foreground">Define your AI recruiter's persona</p>
                            </div>
                            <button
                                onClick={() => setShowAgentModal(false)}
                                className="p-2 hover:bg-secondary rounded-full transition-colors"
                            >
                                <XCircle className="w-6 h-6 text-muted-foreground" />
                            </button>
                        </div>

                        <div className="p-6">
                            {error && (
                                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm font-medium flex items-center gap-2">
                                    <XCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            <form onSubmit={createAgent} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground">Agent Name</label>
                                    <input
                                        type="text"
                                        value={newAgent.name}
                                        onChange={e => setNewAgent({ ...newAgent, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/50"
                                        placeholder="e.g., Sarah - Sales Recruiter"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground">System Prompt / Persona</label>
                                    <textarea
                                        value={newAgent.systemPrompt}
                                        onChange={e => setNewAgent({ ...newAgent, systemPrompt: e.target.value })}
                                        className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-32 resize-none placeholder:text-muted-foreground/50"
                                        placeholder="You are a friendly and professional recruiter named Sarah..."
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">Define how the AI should behave and speak.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground">Interview Questions</label>
                                    <div className="bg-secondary/30 border border-border rounded-xl p-1">
                                        <textarea
                                            placeholder="Enter questions separated by new lines"
                                            onChange={e => {
                                                const lines = e.target.value.split('\n').filter(l => l.trim());
                                                setNewAgent({
                                                    ...newAgent,
                                                    questions: lines.map((text, i) => ({ id: `q${i}`, text }))
                                                });
                                            }}
                                            className="w-full px-4 py-3 bg-transparent border-none outline-none h-40 resize-none placeholder:text-muted-foreground/50"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Each line will be treated as a separate question.</p>
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={isCreating}
                                        className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isCreating ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Creating Agent...
                                            </>
                                        ) : (
                                            'Create Agent'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
