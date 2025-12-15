'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useClickToCallStore, ClickToCallStatus } from '@/lib/store';
import {
    Phone,
    PhoneOff,
    PhoneCall,
    PhoneIncoming,
    PhoneMissed,
    X,
    Mic,
    MicOff,
    Volume2,
    VolumeX,
    User,
    Clock,
    Minimize2,
    Maximize2,
    History,
    AlertCircle,
} from 'lucide-react';
import { Button3D } from './Button3D';

interface CallDialerProps {
    onClose?: () => void;
}

export function CallDialer({ onClose }: CallDialerProps) {
    const {
        activeCall,
        isDialerOpen,
        isConfigured,
        virtualNumber,
        callHistory,
        updateCallStatus,
        updateCallDuration,
        endCall,
        closeDialer,
    } = useClickToCallStore();

    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const [isMinimized, setIsMinimized] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [isHangingUp, setIsHangingUp] = useState(false);

    // Duration timer
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (activeCall && activeCall.status === 'connected') {
            interval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - activeCall.startTime.getTime()) / 1000);
                updateCallDuration(elapsed);
            }, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeCall, updateCallDuration]);

    // Poll for call status
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (activeCall && ['initiating', 'ringing'].includes(activeCall.status)) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/click-to-call/status?dbCallId=${activeCall.dbCallId}`);
                    const data = await res.json();
                    
                    if (data.dbCall) {
                        const status = data.dbCall.status;
                        if (status === 'calling') {
                            updateCallStatus('ringing');
                        } else if (status === 'completed' || status === 'failed') {
                            updateCallStatus(status === 'completed' ? 'ended' : 'failed');
                        }
                    }
                } catch (error) {
                    console.error('Failed to poll call status:', error);
                }
            }, 2000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeCall, updateCallStatus]);

    const handleHangup = useCallback(async () => {
        if (!activeCall || isHangingUp) return;

        setIsHangingUp(true);
        try {
            await fetch('/api/click-to-call/hangup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dbCallId: activeCall.dbCallId }),
            });
            endCall();
        } catch (error) {
            console.error('Hangup failed:', error);
        } finally {
            setIsHangingUp(false);
        }
    }, [activeCall, endCall, isHangingUp]);

    const handleClose = useCallback(() => {
        if (activeCall && ['initiating', 'ringing', 'connected'].includes(activeCall.status)) {
            // Don't close if call is active
            setIsMinimized(true);
            return;
        }
        closeDialer();
        onClose?.();
    }, [activeCall, closeDialer, onClose]);

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getStatusInfo = (status: ClickToCallStatus) => {
        switch (status) {
            case 'initiating':
                return { text: 'Initiating call...', color: 'text-blue-500', icon: Phone, pulse: true };
            case 'ringing':
                return { text: 'Ringing...', color: 'text-yellow-500', icon: PhoneIncoming, pulse: true };
            case 'connected':
                return { text: 'Connected', color: 'text-green-500', icon: PhoneCall, pulse: false };
            case 'ended':
                return { text: 'Call Ended', color: 'text-gray-500', icon: PhoneOff, pulse: false };
            case 'failed':
                return { text: 'Call Failed', color: 'text-red-500', icon: PhoneMissed, pulse: false };
            default:
                return { text: 'Ready', color: 'text-gray-400', icon: Phone, pulse: false };
        }
    };

    if (!isDialerOpen) return null;

    // Minimized view
    if (isMinimized && activeCall) {
        const statusInfo = getStatusInfo(activeCall.status);
        return (
            <div 
                className="fixed bottom-4 right-4 z-[200] bg-card border border-border rounded-2xl shadow-2xl p-4 cursor-pointer animate-in slide-in-from-bottom-5 duration-300"
                onClick={() => setIsMinimized(false)}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        activeCall.status === 'connected' ? 'bg-green-500' : 'bg-primary'
                    } ${statusInfo.pulse ? 'animate-pulse' : ''}`}>
                        <statusInfo.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="font-semibold text-foreground text-sm">{activeCall.driverName || 'Unknown'}</p>
                        <p className={`text-xs ${statusInfo.color}`}>
                            {activeCall.status === 'connected' ? formatDuration(activeCall.duration) : statusInfo.text}
                        </p>
                    </div>
                    <Maximize2 className="w-4 h-4 text-muted-foreground ml-2" />
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary/10 to-violet-500/10">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/20 rounded-xl">
                            <Phone className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground">Click-to-Call</h3>
                            {virtualNumber && (
                                <p className="text-xs text-muted-foreground">Via {virtualNumber}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {activeCall && (
                            <button
                                onClick={() => setIsMinimized(true)}
                                className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Minimize2 className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className={`p-2 hover:bg-secondary rounded-lg transition-colors ${
                                showHistory ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <History className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* History View */}
                {showHistory ? (
                    <div className="p-4 max-h-80 overflow-y-auto">
                        <h4 className="text-sm font-bold text-foreground mb-3">Recent Calls</h4>
                        {callHistory.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No call history</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {callHistory.map((call, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <User className="w-5 h-5 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-foreground text-sm">{call.driverName || 'Unknown'}</p>
                                            <p className="text-xs text-muted-foreground">{call.customerNumber}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-xs font-medium ${
                                                call.status === 'ended' ? 'text-green-500' : 'text-red-500'
                                            }`}>
                                                {call.status === 'ended' ? 'Completed' : 'Failed'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{formatDuration(call.duration)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : activeCall ? (
                    /* Active Call View */
                    <div className="p-6">
                        {/* Caller Info */}
                        <div className="text-center mb-6">
                            <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 ${
                                activeCall.status === 'connected' 
                                    ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                                    : activeCall.status === 'failed'
                                    ? 'bg-gradient-to-br from-red-500 to-rose-600'
                                    : 'bg-gradient-to-br from-primary to-violet-600'
                            } ${getStatusInfo(activeCall.status).pulse ? 'animate-pulse' : ''}`}>
                                <User className="w-12 h-12 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-1">
                                {activeCall.driverName || 'Unknown'}
                            </h3>
                            <p className="text-muted-foreground text-sm mb-2">
                                {activeCall.customerNumber}
                            </p>
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                                getStatusInfo(activeCall.status).color
                            } bg-secondary/50`}>
                                {React.createElement(getStatusInfo(activeCall.status).icon, { className: 'w-4 h-4' })}
                                {activeCall.status === 'connected' 
                                    ? formatDuration(activeCall.duration) 
                                    : getStatusInfo(activeCall.status).text}
                            </div>
                        </div>

                        {/* Call Controls */}
                        {activeCall.status === 'connected' && (
                            <div className="flex justify-center gap-4 mb-6">
                                <button
                                    onClick={() => setIsMuted(!isMuted)}
                                    className={`p-4 rounded-full transition-all ${
                                        isMuted 
                                            ? 'bg-red-500/20 text-red-500' 
                                            : 'bg-secondary hover:bg-secondary/80 text-foreground'
                                    }`}
                                >
                                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                                </button>
                                <button
                                    onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                                    className={`p-4 rounded-full transition-all ${
                                        !isSpeakerOn 
                                            ? 'bg-red-500/20 text-red-500' 
                                            : 'bg-secondary hover:bg-secondary/80 text-foreground'
                                    }`}
                                >
                                    {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                                </button>
                            </div>
                        )}

                        {/* Hangup / Close Button */}
                        <div className="flex justify-center">
                            {['initiating', 'ringing', 'connected'].includes(activeCall.status) ? (
                                <button
                                    onClick={handleHangup}
                                    disabled={isHangingUp}
                                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all shadow-lg shadow-red-500/30 hover:scale-105 disabled:opacity-50"
                                >
                                    <PhoneOff className="w-8 h-8" />
                                </button>
                            ) : (
                                <Button3D variant="secondary" onClick={handleClose}>
                                    Close
                                </Button3D>
                            )}
                        </div>
                    </div>
                ) : (
                    /* No Active Call */
                    <div className="p-6 text-center">
                        {!isConfigured ? (
                            <div className="py-8">
                                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                                <h4 className="font-bold text-foreground mb-2">Not Configured</h4>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Click-to-call is not configured. Please set up your Tata API credentials in the Integrations page.
                                </p>
                                <Button3D variant="primary" onClick={() => window.location.href = '/integrations'}>
                                    Go to Integrations
                                </Button3D>
                            </div>
                        ) : (
                            <div className="py-8">
                                <Phone className="w-12 h-12 mx-auto mb-4 text-primary opacity-50" />
                                <h4 className="font-bold text-foreground mb-2">Ready to Call</h4>
                                <p className="text-sm text-muted-foreground">
                                    Select a driver from the list to initiate a click-to-call.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default CallDialer;

