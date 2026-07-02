import { useCallback, useEffect, useRef, useState } from "react";
import {
  isMockLmpEnabled,
  MOCK_LMP_SNAPSHOT,
} from "@orderbook/core/lib/mockLmpData";

export type LMPSnapshotAccount = {
  address: string;
  depthScore: string;
  uptimeScore: string;
  makerVolume: string;
  qFinal: string;
};

export type LMPSnapshot = {
  snapshotId: number;
  pair: string;
  epoch: number;
  topAccounts: LMPSnapshotAccount[];
  volatilityActive: boolean;
  timestamp: string;
};

function getLmpWsUrl(): string | null {
  if (process.env.NEXT_PUBLIC_LMP_WS_URL) {
    return process.env.NEXT_PUBLIC_LMP_WS_URL;
  }
  const graphqlWs = process.env.NEXT_PUBLIC_GRAPHQL_WS_URL;
  if (graphqlWs) {
    return graphqlWs.replace(/\/ws\/?$/, "") + "/lmp/live";
  }
  return null;
}

const MAX_SNAPSHOTS = 60;
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;
const MOCK_INTERVAL_MS = 10_000;

export function useLMPLive() {
  const [snapshots, setSnapshots] = useState<LMPSnapshot[]>([]);
  const [connected, setConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  const connect = useCallback(() => {
    const url = getLmpWsUrl();
    if (!url || unmountedRef.current) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (unmountedRef.current) { ws.close(); return; }
      retryCountRef.current = 0;
      setConnected(true);
    };

    ws.onclose = () => {
      if (unmountedRef.current) return;
      setConnected(false);
      const delay = Math.min(
        BACKOFF_BASE_MS * 2 ** retryCountRef.current,
        BACKOFF_MAX_MS
      );
      retryCountRef.current += 1;
      retryTimerRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onmessage = (event) => {
      try {
        const snapshot: LMPSnapshot = JSON.parse(event.data as string);
        setSnapshots((prev) => [snapshot, ...prev].slice(0, MAX_SNAPSHOTS));
      } catch {
        // ignore malformed frames
      }
    };
  }, []);

  useEffect(() => {
    unmountedRef.current = false;

    if (isMockLmpEnabled()) {
      setConnected(true);
      const emit = () =>
        setSnapshots((prev) =>
          [{ ...MOCK_LMP_SNAPSHOT, snapshotId: Date.now(), timestamp: new Date().toISOString() }, ...prev].slice(0, MAX_SNAPSHOTS)
        );
      emit();
      const id = setInterval(emit, MOCK_INTERVAL_MS);
      return () => {
        unmountedRef.current = true;
        clearInterval(id);
      };
    }

    connect();
    return () => {
      unmountedRef.current = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return {
    snapshots,
    connected,
    latestSnapshot: snapshots[0] ?? null,
  };
}
