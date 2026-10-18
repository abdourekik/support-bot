import type { Message } from './types';

// sessionStorage can be missing or throw (private mode, blocked cookies,
// sandboxed iframes): every access is wrapped, and the widget falls back to
// in-memory state.
const SESSION_KEY = 'maison-nora-chat:session-id';
const MESSAGES_KEY = 'maison-nora-chat:messages';

let memorySessionId: string | null = null;

function read(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Ignore: state stays in memory for this page.
  }
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

export function getSessionId(): string {
  const stored = read(SESSION_KEY);
  if (stored && /^[A-Za-z0-9_-]{8,64}$/.test(stored)) return stored;
  if (!memorySessionId) {
    memorySessionId = newId();
    write(SESSION_KEY, memorySessionId);
  }
  return memorySessionId;
}

export function loadMessages(): Message[] {
  try {
    const parsed: unknown = JSON.parse(read(MESSAGES_KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as Message[]) : [];
  } catch {
    return [];
  }
}

export function saveMessages(messages: Message[]): void {
  write(MESSAGES_KEY, JSON.stringify(messages.slice(-50)));
}

export { newId };
