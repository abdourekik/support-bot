export interface Source {
  file: string;
  section: string;
}

/** Response of POST /webhook/chat (see n8n/workflows/chat.json). */
export interface ChatResponse {
  answer: string;
  sources: Source[];
  escalated: boolean;
}

export type EmailStatus = 'idle' | 'sending' | 'sent' | 'error';

export interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  sources?: Source[];
  escalated?: boolean;
  /** Set on a failed request: the user message to send again. */
  retryText?: string;
}

export interface WidgetConfig {
  chatUrl: string;
  emailUrl: string;
}
