import { postWorkEvent, type WorkEventPayload } from './api';

/**
 * Offline mode for field workers: button presses made without a connection are kept
 * on the phone with their real time and sent in the same order once the phone is online.
 */
const KEY = 'rail-crm-offline-events';

export type QueuedEvent = {
  id: string;
  path: string;
  payload: WorkEventPayload & { recorded_at?: string };
  queuedAt: string;
};

function read(): QueuedEvent[] {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || '[]') as QueuedEvent[];
  } catch {
    return [];
  }
}

function write(items: QueuedEvent[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // storage full or blocked: nothing more we can do here
  }
  window.dispatchEvent(new Event('rail-crm-offline-changed'));
}

export function pendingEvents(): QueuedEvent[] {
  return typeof window === 'undefined' ? [] : read();
}

/** A failed fetch without an HTTP answer means: no connection. */
export function isNetworkError(error: unknown) {
  return (typeof navigator !== 'undefined' && navigator.onLine === false) || error instanceof TypeError;
}

export function enqueue(path: string, payload: WorkEventPayload): QueuedEvent {
  const item: QueuedEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    path,
    payload: { ...payload, recorded_at: new Date().toISOString() },
    queuedAt: new Date().toISOString(),
  };
  write([...read(), item]);
  return item;
}

let flushing = false;

/**
 * Sends queued events in order. Stops at the first network error (still offline);
 * an event the server rejects is dropped and reported so the queue cannot block.
 */
export async function flushQueue(): Promise<{ sent: number; rejected: string[] }> {
  if (flushing) return { sent: 0, rejected: [] };
  flushing = true;
  let sent = 0;
  const rejected: string[] = [];
  try {
    for (const item of read()) {
      try {
        await postWorkEvent(item.path, item.payload);
        sent += 1;
      } catch (error) {
        if (isNetworkError(error)) break;
        rejected.push(error instanceof Error ? error.message : String(error));
      }
      write(read().filter((queued) => queued.id !== item.id));
    }
  } finally {
    flushing = false;
  }
  return { sent, rejected };
}
