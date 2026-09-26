// Door statuses and pending sign-ups, kept on the tablet so nothing is lost
// when signal drops. `syncOutbox` sends anything waiting once the tablet is online.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Door } from './addresses';

export type DoorStatus = 'none' | 'signed' | 'ni' | 'na' | 'cb';

export interface DoorLog {
  status: DoorStatus;
  note?: string;
  back?: string;
  at: string;
}

export interface OutboxItem {
  id: string;
  kind: 'door' | 'signup';
  payload: unknown;
  at: string;
}

const LOGS_KEY = 'doorstep.logs.v1';
const DOORS_KEY = 'doorstep.doors.v1';
const OUTBOX_KEY = 'doorstep.outbox.v1';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: keep going in memory */
  }
}

// Stand-in for the office API. Replace with a POST to your backend.
async function sendToOffice(items: OutboxItem[]): Promise<void> {
  await new Promise((r) => setTimeout(r, 900));
  if (!navigator.onLine) throw new Error('offline');
  console.info('[doorstep] sent to office', items);
}

export function useDoorstepStore() {
  const [doors, setDoors] = useState<Record<string, Door>>(() => read(DOORS_KEY, {}));
  const [logs, setLogs] = useState<Record<string, DoorLog>>(() => read(LOGS_KEY, {}));
  const [outbox, setOutbox] = useState<OutboxItem[]>(() => read(OUTBOX_KEY, []));
  const [online, setOnline] = useState(() => navigator.onLine);
  const [forcedOffline, setForcedOffline] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const busy = useRef(false);

  useEffect(() => write(DOORS_KEY, doors), [doors]);
  useEffect(() => write(LOGS_KEY, logs), [logs]);
  useEffect(() => write(OUTBOX_KEY, outbox), [outbox]);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  const isOnline = online && !forcedOffline;

  const flush = useCallback(async () => {
    if (busy.current || !isOnline) return 0;
    const pending = read<OutboxItem[]>(OUTBOX_KEY, []);
    if (!pending.length) return 0;
    busy.current = true;
    setSyncing(true);
    try {
      await sendToOffice(pending);
      const sentIds = new Set(pending.map((p) => p.id));
      setOutbox((o) => o.filter((x) => !sentIds.has(x.id)));
      return pending.filter((p) => p.kind === 'signup').length;
    } catch {
      return 0;
    } finally {
      busy.current = false;
      setSyncing(false);
    }
  }, [isOnline]);

  const enqueue = useCallback((kind: OutboxItem['kind'], payload: unknown) => {
    const item: OutboxItem = { id: crypto.randomUUID(), kind, payload, at: new Date().toISOString() };
    setOutbox((o) => {
      const next = [...o, item];
      write(OUTBOX_KEY, next);
      return next;
    });
  }, []);

  const addDoors = useCallback((list: Door[]) => {
    setDoors((d) => {
      const next = { ...d };
      for (const door of list) next[door.id] = door;
      return next;
    });
  }, []);

  const logDoor = useCallback(
    (id: string, log: Omit<DoorLog, 'at'> | null) => {
      setLogs((l) => {
        const next = { ...l };
        if (log) next[id] = { ...log, at: new Date().toISOString() };
        else delete next[id];
        return next;
      });
      enqueue('door', { doorId: id, ...(log ?? { status: 'none' }) });
    },
    [enqueue],
  );

  return {
    doors, logs, addDoors, logDoor,
    outbox, enqueue, flush, syncing,
    online: isOnline, forcedOffline, setForcedOffline,
  };
}
