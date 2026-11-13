'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export type SyncMode = 'LIVE_STREAM' | 'POLLING_FALLBACK' | 'CONNECTING';

export function useRealtimeDashboard(onUpdate: () => void) {
  const [syncMode, setSyncMode] = useState<SyncMode>('CONNECTING');
  const [lastEventTime, setLastEventTime] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startPollingFallback = useCallback(() => {
    if (pollingTimerRef.current) return;
    setSyncMode('POLLING_FALLBACK');
    // Poll every 8 seconds when SSE is disconnected
    pollingTimerRef.current = setInterval(() => {
      onUpdate();
    }, 8000);
  }, [onUpdate]);

  const stopPollingFallback = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('finos_access_token');
    if (!token) {
      startPollingFallback();
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    const streamUrl = `${apiBase}/dashboard/stream?token=${encodeURIComponent(token)}`;

    try {
      const es = new EventSource(streamUrl);
      eventSourceRef.current = es;

      es.addEventListener('connected', () => {
        setSyncMode('LIVE_STREAM');
        stopPollingFallback();
      });

      es.addEventListener('kpi_update', (e) => {
        setLastEventTime(new Date().toLocaleTimeString());
        onUpdate();
      });

      es.addEventListener('source_ingested', (e) => {
        setLastEventTime(new Date().toLocaleTimeString());
        onUpdate();
      });

      es.addEventListener('policy_updated', (e) => {
        setLastEventTime(new Date().toLocaleTimeString());
        onUpdate();
      });

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        startPollingFallback();
      };
    } catch {
      startPollingFallback();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      stopPollingFallback();
    };
  }, [onUpdate, startPollingFallback, stopPollingFallback]);

  return { syncMode, lastEventTime };
}
