import { ApiError, postWorkEvent } from './api';
import { readJson, removeJson, writeJson } from './storage';
import type { WorkEventPayload } from './types';

/**
 * Button presses made without a connection. They keep the real time of the press
 * (recorded_at) and are sent in the same order once the phone is online again.
 */
export type QueuedEvent = {
  id: string;
  action: string;
  path: string;
  assignmentId: number;
  payload: WorkEventPayload;
  queuedAt: string;
};

const FILE = 'offline-queue';
let items: QueuedEvent[] = [];
let loaded = false;
let flushing = false;
const listeners = new Set<(queue: QueuedEvent[]) => void>();

function emit() {
  writeJson(FILE, items);
  listeners.forEach((listener) => listener(items));
}

export async function loadQueue(): Promise<QueuedEvent[]> {
  if (!loaded) {
    items = await readJson<QueuedEvent[]>(FILE, []);
    loaded = true;
  }
  return items;
}

export function getQueue() {
  return items;
}

export function subscribeQueue(listener: (queue: QueuedEvent[]) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function enqueue(action: string, path: string, payload: WorkEventPayload): QueuedEvent {
  const item: QueuedEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    path,
    assignmentId: payload.assignment_id,
    payload: { ...payload, recorded_at: new Date().toISOString() },
    queuedAt: new Date().toISOString(),
  };
  items = [...items, item];
  emit();
  return item;
}

/** Last offline action for an order, so the screen can show the next step. */
export function lastQueuedAction(assignmentId: number) {
  const own = items.filter((item) => item.assignmentId === assignmentId);
  return own.length ? own[own.length - 1].action : null;
}

export function clearQueue() {
  items = [];
  removeJson(FILE);
  listeners.forEach((listener) => listener(items));
}

/**
 * Sends queued presses in order. Stops at the first connection problem;
 * a press the server rejects is dropped and reported, so the queue cannot get stuck.
 */
export async function flushQueue(): Promise<{ sent: number; rejected: string[] }> {
  await loadQueue();
  if (flushing || items.length === 0) return { sent: 0, rejected: [] };
  flushing = true;
  let sent = 0;
  const rejected: string[] = [];
  try {
    for (const item of [...items]) {
      try {
        await postWorkEvent(item.path, item.payload);
        sent += 1;
      } catch (error) {
        if (!(error instanceof ApiError)) break;
        if (error.status === 401) break;
        rejected.push(error.message);
      }
      items = items.filter((queued) => queued.id !== item.id);
      emit();
    }
  } finally {
    flushing = false;
  }
  return { sent, rejected };
}
