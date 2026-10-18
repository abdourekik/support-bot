import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { ChatError, ERROR_MESSAGES, sendEscalationEmail, sendMessage, stripSourceLine } from './api';
import { EmailForm } from './EmailForm';
import { getSessionId, loadMessages, newId, saveMessages } from './storage';
import type { EmailStatus, Message, WidgetConfig } from './types';
import { useFocusTrap } from './useFocusTrap';

const WELCOME =
  "Bonjour ! Je suis l'assistant virtuel de Maison Nora. Je réponds à vos questions sur la livraison, les retours, le paiement ou l'entretien du linge. Comment puis-je vous aider ?";

const SUGGESTIONS = [
  'Quels sont les délais de livraison ?',
  'Comment retourner un article ?',
  'Je veux parler à un conseiller',
];

/** Event the host page can dispatch to open the chat: window.dispatchEvent(new Event(OPEN_EVENT)). */
export const OPEN_EVENT = 'maison-nora-chat:open';

export function ChatWidget({ config }: { config: WidgetConfig }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('idle');

  const panelRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const titleId = useId();

  const close = useCallback(() => {
    setOpen(false);
    bubbleRef.current?.focus();
  }, []);

  useFocusTrap(panelRef, open, close);

  useEffect(() => saveMessages(messages), [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, openChat);
    return () => window.removeEventListener(OPEN_EVENT, openChat);
  }, []);

  // Auto-scroll to the newest message.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    list.scrollTo({ top: list.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [messages, pending, open]);

  async function ask(text: string) {
    const message = text.trim().slice(0, 1000);
    if (!message || pending) return;

    setMessages((prev) => [
      ...prev.filter((m) => !m.retryText),
      { id: newId(), role: 'user', text: message },
    ]);
    setInput('');
    setPending(true);

    try {
      const res = await sendMessage(config.chatUrl, getSessionId(), message);
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: 'bot', text: stripSourceLine(res.answer), sources: res.sources, escalated: res.escalated },
      ]);
      if (res.escalated) setEmailStatus((s) => (s === 'sent' ? s : 'idle'));
    } catch (err) {
      const kind = err instanceof ChatError ? err.kind : 'network';
      setMessages((prev) => [...prev, { id: newId(), role: 'bot', text: ERROR_MESSAGES[kind], retryText: message }]);
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  }

  function retry(message: Message) {
    if (!message.retryText) return;
    // Remove the failed user message and the error, then send again.
    setMessages((prev) => {
      const index = prev.findIndex((m) => m.id === message.id);
      return prev.slice(0, Math.max(0, index - 1));
    });
    void ask(message.retryText);
  }

  async function submitEmail(email: string) {
    setEmailStatus('sending');
    try {
      await sendEscalationEmail(config.emailUrl, getSessionId(), email);
      setEmailStatus('sent');
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: 'bot',
          text: `Merci ! Un conseiller de Maison Nora vous répondra à l'adresse ${email} sous 2 jours ouvrés.`,
        },
      ]);
    } catch {
      setEmailStatus('error');
    }
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void ask(input);
    }
  }

  const lastBot = [...messages].reverse().find((m) => m.role === 'bot');
  const showEmailForm = Boolean(lastBot?.escalated) && emailStatus !== 'sent' && !pending;
  const hasUserMessages = messages.some((m) => m.role === 'user');

  return (
    <div className="mn-root">
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          className="mn-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <header className="mn-header">
            <span className="mn-avatar" aria-hidden="true">N</span>
            <div className="mn-header__text">
              <h2 id={titleId}>Service client Maison Nora</h2>
              <p>Assistant virtuel · répond à partir de nos conditions</p>
            </div>
            <button type="button" className="mn-icon-button" onClick={close} aria-label="Fermer le chat">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </header>

          <div ref={listRef} className="mn-messages" role="log" aria-live="polite" aria-relevant="additions">
            <div className="mn-message mn-message--bot">
              <p>{WELCOME}</p>
            </div>

            {!hasUserMessages && (
              <div className="mn-chips" aria-label="Questions suggérées">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className="mn-chip" onClick={() => void ask(s)} disabled={pending}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`mn-message mn-message--${m.role}${m.retryText ? ' mn-message--error' : ''}`}
              >
                <span className="mn-sr-only">{m.role === 'user' ? 'Vous :' : 'Assistant :'}</span>
                <p>{m.text}</p>
                {m.sources && m.sources.length > 0 && (
                  <ul className="mn-sources" aria-label="Sources">
                    {m.sources.map((s) => (
                      <li key={`${s.file}#${s.section}`} className="mn-source" title={s.file}>
                        {s.section}
                      </li>
                    ))}
                  </ul>
                )}
                {m.retryText && (
                  <button type="button" className="mn-retry" onClick={() => retry(m)} disabled={pending}>
                    Réessayer
                  </button>
                )}
                {m === lastBot && showEmailForm && <EmailForm status={emailStatus} onSubmit={submitEmail} />}
              </div>
            ))}

            {pending && (
              <div className="mn-message mn-message--bot mn-typing" role="status" aria-label="L'assistant écrit…">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>

          <form
            className="mn-composer"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
          >
            <label className="mn-sr-only" htmlFor={`${panelId}-input`}>
              Votre message
            </label>
            <textarea
              id={`${panelId}-input`}
              ref={inputRef}
              rows={1}
              maxLength={1000}
              placeholder="Écrivez votre question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onInputKeyDown}
            />
            <button type="submit" className="mn-send" disabled={pending || !input.trim()} aria-label="Envoyer le message">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M4 12l16-8-6 16-2.5-6.5L4 12z" fill="currentColor" />
              </svg>
            </button>
          </form>
          <p className="mn-disclaimer">
            Assistant automatisé. Les échanges sont enregistrés pour améliorer le service.
          </p>
        </div>
      )}

      <button
        ref={bubbleRef}
        type="button"
        className="mn-bubble"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? 'Fermer le chat du service client' : 'Ouvrir le chat du service client'}
      >
        {open ? (
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
            <path
              d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-8z"
              fill="currentColor"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
