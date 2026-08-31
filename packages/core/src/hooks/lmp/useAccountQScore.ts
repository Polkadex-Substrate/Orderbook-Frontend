import { useCallback, useEffect, useRef, useState } from "react";
import {
  isMockLmpEnabled,
  MOCK_ACCOUNT_QSCORE,
} from "@orderbook/core/lib/mockLmpData";

export type AccountQScore = {
  address: string;
  epoch: number;
  pair: string;
  depthScore: string;
  uptimeScore: string;
  makerVolumeScore: string;
  qFinal: string;
  rank: number;
  totalParticipants: number;
  estimatedReward: string;
  volatilityMultiplierActive: boolean;
  timestamp: string;
};

function getAccountQScoreWsUrl(address: string): string | null {
  const base =
    process.env.NEXT_PUBLIC_LMP_WS_URL ||
    process.env.NEXT_PUBLIC_GRAPHQL_WS_URL?.replace(/\/ws\/?$/, "");
  if (!base) return null;
  return `${base}/lmp/accounts/${encodeURIComponent(address)}`;
}

const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;
const MOCK_INTERVAL_MS = 10_000;

export function useAccountQScore(address: string | undefined) {
  const [qScore, setQScore] = useState<AccountQScore | null>(null);
  const [connected, setConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  const connect = useCallback(() => {
    if (!address || unmountedRef.current) return;
    const url = getAccountQScoreWsUrl(address);
    if (!url) return;

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

    ws.onerror = () => { ws.close(); };

    ws.onmessage = (event) => {
      try {
        setQScore(JSON.parse(event.data as string));
      } catch {
        // ignore malformed frames
      }
    };
  }, [address]);

  useEffect(() => {
    unmountedRef.current = false;
    setQScore(null);
    setConnected(false);
    retryCountRef.current = 0;

    if (isMockLmpEnabled()) {
      setConnected(true);
      const emit = () =>
        setQScore({ ...MOCK_ACCOUNT_QSCORE, address: address ?? "", timestamp: new Date().toISOString() });
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
  }, [connect, address]);

  return { qScore, connected };
}
