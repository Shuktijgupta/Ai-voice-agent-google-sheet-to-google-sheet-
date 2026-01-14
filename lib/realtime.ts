/**
 * Real-time call monitoring utilities
 */

export interface CallUpdate {
    type: 'connected' | 'update' | 'error' | 'transcript' | 'status';
    timestamp: string;
    calls?: any[];
    call?: any;
    transcript?: string;
    status?: string;
    message?: string;
}

export class RealtimeCallMonitor {
    private eventSource: EventSource | null = null;
    private callbacks: Map<string, Set<(data: CallUpdate) => void>> = new Map();

    connect(callId?: string, driverId?: string) {
        if (this.eventSource) {
            this.disconnect();
        }

        const params = new URLSearchParams();
        if (callId) params.set('callId', callId);
        if (driverId) params.set('driverId', driverId);

        const url = `/api/calls/stream?${params.toString()}`;
        this.eventSource = new EventSource(url);

        this.eventSource.onmessage = (event) => {
            try {
                const data: CallUpdate = JSON.parse(event.data);
                this.notifyCallbacks(data.type, data);
            } catch (error) {
                console.error('Error parsing SSE message:', error);
            }
        };

        this.eventSource.onerror = (error) => {
            console.error('SSE connection error:', error);
            this.notifyCallbacks('error', {
                type: 'error',
                timestamp: new Date().toISOString(),
                message: 'Connection error'
            });
        };
    }

    on(type: string, callback: (data: CallUpdate) => void) {
        if (!this.callbacks.has(type)) {
            this.callbacks.set(type, new Set());
        }
        this.callbacks.get(type)!.add(callback);
    }

    off(type: string, callback: (data: CallUpdate) => void) {
        this.callbacks.get(type)?.delete(callback);
    }

    private notifyCallbacks(type: string, data: CallUpdate) {
        this.callbacks.get(type)?.forEach(callback => callback(data));
        this.callbacks.get('*')?.forEach(callback => callback(data));
    }

    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.callbacks.clear();
    }
}

export const realtimeMonitor = new RealtimeCallMonitor();






