import { create } from 'zustand';

// ============================================
// SYNC & AUTO-DIALER STORE
// ============================================

interface SyncState {
    // Auto-sync state
    isAutoSyncing: boolean;
    isSyncing: boolean;
    lastSyncTime: Date | null;
    syncError: string | null;
    syncResults: any[];
    
    // Auto-dialer state
    isAutoDialing: boolean;
    selectedDriverIds: Set<string>;
    
    // Actions
    startAutoSync: () => void;
    stopAutoSync: () => void;
    setSyncing: (syncing: boolean) => void;
    setLastSyncTime: (time: Date | null) => void;
    setSyncError: (error: string | null) => void;
    setSyncResults: (results: any[]) => void;
    
    // Auto-dialer actions
    startAutoDialing: () => void;
    stopAutoDialing: () => void;
    setSelectedDriverIds: (ids: Set<string>) => void;
    addSelectedDriver: (id: string) => void;
    removeSelectedDriver: (id: string) => void;
    clearSelectedDrivers: () => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
    // Initial state
    isAutoSyncing: false,
    isSyncing: false,
    lastSyncTime: null,
    syncError: null,
    syncResults: [],
    
    isAutoDialing: false,
    selectedDriverIds: new Set(),
    
    // Auto-sync actions
    startAutoSync: () => set({ isAutoSyncing: true, syncError: null }),
    stopAutoSync: () => set({ isAutoSyncing: false }),
    setSyncing: (syncing) => set({ isSyncing: syncing }),
    setLastSyncTime: (time) => set({ lastSyncTime: time }),
    setSyncError: (error) => set({ syncError: error }),
    setSyncResults: (results) => set({ syncResults: results }),
    
    // Auto-dialer actions
    startAutoDialing: () => set({ isAutoDialing: true }),
    stopAutoDialing: () => set({ isAutoDialing: false }),
    setSelectedDriverIds: (ids) => set({ selectedDriverIds: ids }),
    addSelectedDriver: (id) => {
        const current = get().selectedDriverIds;
        const newSet = new Set(current);
        newSet.add(id);
        set({ selectedDriverIds: newSet });
    },
    removeSelectedDriver: (id) => {
        const current = get().selectedDriverIds;
        const newSet = new Set(current);
        newSet.delete(id);
        set({ selectedDriverIds: newSet });
    },
    clearSelectedDrivers: () => set({ selectedDriverIds: new Set() }),
}));

// ============================================
// CLICK-TO-CALL STORE
// ============================================

export type ClickToCallStatus = 
    | 'idle'
    | 'initiating'
    | 'ringing'
    | 'connected'
    | 'ended'
    | 'failed';

export interface ActiveCall {
    callId: string;           // Provider call ID
    dbCallId: string;         // Database call ID
    driverId?: string;
    driverName?: string;
    customerNumber: string;
    status: ClickToCallStatus;
    startTime: Date;
    duration: number;         // Duration in seconds (updated live)
}

interface ClickToCallState {
    // Configuration
    isConfigured: boolean;
    virtualNumber: string | null;
    agentNumber: string | null;
    
    // Active call state
    activeCall: ActiveCall | null;
    isDialerOpen: boolean;
    callHistory: ActiveCall[];
    
    // Actions
    setConfiguration: (config: { isConfigured: boolean; virtualNumber: string | null; agentNumber: string | null }) => void;
    
    // Call actions
    initiateCall: (call: Omit<ActiveCall, 'duration'>) => void;
    updateCallStatus: (status: ClickToCallStatus) => void;
    updateCallDuration: (duration: number) => void;
    endCall: () => void;
    
    // Dialer UI
    openDialer: () => void;
    closeDialer: () => void;
    toggleDialer: () => void;
    
    // History
    addToHistory: (call: ActiveCall) => void;
    clearHistory: () => void;
}

export const useClickToCallStore = create<ClickToCallState>((set, get) => ({
    // Initial state
    isConfigured: false,
    virtualNumber: null,
    agentNumber: null,
    
    activeCall: null,
    isDialerOpen: false,
    callHistory: [],
    
    // Configuration
    setConfiguration: (config) => set({
        isConfigured: config.isConfigured,
        virtualNumber: config.virtualNumber,
        agentNumber: config.agentNumber,
    }),
    
    // Call actions
    initiateCall: (call) => set({
        activeCall: { ...call, duration: 0 },
        isDialerOpen: true,
    }),
    
    updateCallStatus: (status) => {
        const current = get().activeCall;
        if (current) {
            set({ activeCall: { ...current, status } });
        }
    },
    
    updateCallDuration: (duration) => {
        const current = get().activeCall;
        if (current) {
            set({ activeCall: { ...current, duration } });
        }
    },
    
    endCall: () => {
        const current = get().activeCall;
        if (current) {
            // Add to history
            const history = get().callHistory;
            const endedCall: ActiveCall = { ...current, status: 'ended' as ClickToCallStatus };
            set({
                activeCall: null,
                callHistory: [endedCall, ...history].slice(0, 50), // Keep last 50
            });
        } else {
            set({ activeCall: null });
        }
    },
    
    // Dialer UI
    openDialer: () => set({ isDialerOpen: true }),
    closeDialer: () => set({ isDialerOpen: false }),
    toggleDialer: () => set((state) => ({ isDialerOpen: !state.isDialerOpen })),
    
    // History
    addToHistory: (call) => {
        const history = get().callHistory;
        set({ callHistory: [call, ...history].slice(0, 50) });
    },
    clearHistory: () => set({ callHistory: [] }),
}));

// Helper hook for sync operations
export const useSync = () => {
    const store = useSyncStore();
    
    const performSync = async () => {
        if (store.isSyncing) return;
        
        store.setSyncing(true);
        store.setSyncError(null);
        
        try {
            const res = await fetch('/api/integrations/google-sheets/sync', { method: 'POST' });
            const data = await res.json();
            
            if (res.ok) {
                store.setLastSyncTime(new Date());
                store.setSyncResults(data.results || []);
                return { success: true, data };
            } else {
                store.setSyncError(data.error || 'Sync failed');
                return { success: false, error: data.error };
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Sync failed';
            store.setSyncError(message);
            return { success: false, error: message };
        } finally {
            store.setSyncing(false);
        }
    };
    
    return {
        ...store,
        performSync,
    };
};

