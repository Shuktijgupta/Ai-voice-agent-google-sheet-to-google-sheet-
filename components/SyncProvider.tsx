'use client';

import { useEffect, useRef } from 'react';
import { useSyncStore } from '@/lib/store';

interface SyncProviderProps {
    children: React.ReactNode;
    syncInterval?: number; // in milliseconds
    dialerInterval?: number; // in milliseconds
}

export function SyncProvider({ 
    children, 
    syncInterval = 30000,  // 30 seconds default
    dialerInterval = 5000  // 5 seconds default
}: SyncProviderProps) {
    const { 
        isAutoSyncing, 
        isSyncing,
        isAutoDialing,
        selectedDriverIds,
    } = useSyncStore();
    
    const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const dialerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Handle auto-sync
    useEffect(() => {
        const runSync = async () => {
            if (isSyncing) return;
            
            useSyncStore.getState().setSyncing(true);
            
            try {
                const res = await fetch('/api/integrations/google-sheets/sync', { method: 'POST' });
                const data = await res.json();
                
                if (res.ok) {
                    useSyncStore.getState().setLastSyncTime(new Date());
                    useSyncStore.getState().setSyncResults(data.results || []);
                    console.log('Auto-sync completed:', data.results?.length || 0, 'rows processed');
                } else {
                    useSyncStore.getState().setSyncError(data.error || 'Sync failed');
                    console.error('Auto-sync failed:', data.error);
                }
            } catch (error) {
                console.error('Auto-sync error:', error);
                useSyncStore.getState().setSyncError('Sync failed');
            } finally {
                useSyncStore.getState().setSyncing(false);
            }
        };

        if (isAutoSyncing) {
            // Run immediately on start
            runSync();
            
            // Set up interval
            syncIntervalRef.current = setInterval(runSync, syncInterval);
            console.log('Auto-sync started with interval:', syncInterval, 'ms');
        }

        return () => {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
                syncIntervalRef.current = null;
                console.log('Auto-sync stopped');
            }
        };
    }, [isAutoSyncing, syncInterval]);

    // Handle auto-dialer
    useEffect(() => {
        const runDialer = async () => {
            try {
                // Fetch current drivers
                const res = await fetch('/api/drivers');
                const drivers = await res.json();
                
                if (!Array.isArray(drivers)) return;

                // Check if there's an active call
                const hasActiveCall = drivers.some((d: { status: string }) => d.status === 'calling');
                if (hasActiveCall) {
                    console.log('Auto-dialer: Active call in progress, waiting...');
                    return;
                }

                // Find next driver to call from selected ones
                const selectedIds = useSyncStore.getState().selectedDriverIds;
                const nextDriver = drivers.find(
                    (d: { id: string; status: string }) => d.status === 'new' && selectedIds.has(d.id)
                );

                if (nextDriver) {
                    console.log('Auto-dialer: Starting call for', nextDriver.name);
                    
                    const callRes = await fetch('/api/bland/start-call', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ driverId: nextDriver.id }),
                    });

                    if (!callRes.ok) {
                        console.error('Auto-dialer: Call failed for', nextDriver.name);
                    }
                } else {
                    // No more drivers to call
                    const remainingNew = drivers.filter(
                        (d: { id: string; status: string }) => d.status === 'new' && selectedIds.has(d.id)
                    );
                    
                    if (remainingNew.length === 0 && selectedIds.size > 0) {
                        console.log('Auto-dialer: All selected calls completed!');
                        useSyncStore.getState().stopAutoDialing();
                    }
                }
            } catch (error) {
                console.error('Auto-dialer error:', error);
            }
        };

        if (isAutoDialing && selectedDriverIds.size > 0) {
            // Run immediately on start
            runDialer();
            
            // Set up interval
            dialerIntervalRef.current = setInterval(runDialer, dialerInterval);
            console.log('Auto-dialer started with interval:', dialerInterval, 'ms');
        }

        return () => {
            if (dialerIntervalRef.current) {
                clearInterval(dialerIntervalRef.current);
                dialerIntervalRef.current = null;
                console.log('Auto-dialer stopped');
            }
        };
    }, [isAutoDialing, selectedDriverIds.size, dialerInterval]);

    return <>{children}</>;
}

export default SyncProvider;

