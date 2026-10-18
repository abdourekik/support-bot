import type { ChatResponse, Source } from './types';

const TIMEOUT_MS = 30_000;

export class ChatError extends Error {
  constructor(public readonly kind: 'timeout' | 'network' | 'server' | 'invalid') {
    super(kind);
  }
}

async function postJson(url: string, body: unknown): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data: unknown = await res.json().catch(() => null);
    if (!res.ok) throw Object.assign(new ChatError('server'), { status: res.status, data });
    return data;
  } catch (err) {
    if (err instanceof ChatError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') throw new ChatError('timeout');
    throw new ChatError('network');
  } finally {
    clearTimeout(timer);
  }
}

function isSource(value: unknown): value is Source {
  const v = value as Source;
  return typeof v?.file === 'string' && typeof v?.section === 'string';
}

export async function sendMessage(url: string, sessionId: string, message: string): Promise<ChatResponse> {
  const data = (await postJson(url, { session_id: sessionId, message })) as Partial<ChatResponse> | null;
  if (!data || typeof data.answer !== 'string') throw new ChatError('invalid');
  return {
    answer: data.answer,
    sources: Array.isArray(data.sources) ? data.sources.filter(isSource) : [],
    escalated: data.escalated === true,
  };
}

export async function sendEscalationEmail(url: string, sessionId: string, email: string): Promise<void> {
  await postJson(url, { session_id: sessionId, email });
}

/** The workflow appends "Source : …" to the answer; the widget shows sources as tags instead. */
export function stripSourceLine(answer: string): string {
  return answer.replace(/\n+\s*Sources?\s*:[^\n]*\s*$/, '').trim();
}

export const ERROR_MESSAGES: Record<ChatError['kind'], string> = {
  timeout: "Désolé, la réponse prend plus de temps que prévu. Vous pouvez réessayer dans un instant.",
  network: 'Impossible de joindre le service pour le moment. Vérifiez votre connexion puis réessayez.',
  server: 'Désolé, une erreur est survenue de notre côté. Vous pouvez réessayer dans un instant.',
  invalid: 'Désolé, une erreur est survenue de notre côté. Vous pouvez réessayer dans un instant.',
};
