import type { WidgetConfig } from './types';

const DEFAULT_CHAT_URL = 'http://localhost:5678/webhook/chat';

/** Escalation endpoint defaults to the chat URL with "/chat" replaced by "/escalation-email". */
function deriveEmailUrl(chatUrl: string): string {
  return chatUrl.replace(/\/chat\/?$/, '/escalation-email');
}

export function configFromEnv(): WidgetConfig {
  const chatUrl = import.meta.env.VITE_CHAT_WEBHOOK_URL || DEFAULT_CHAT_URL;
  return { chatUrl, emailUrl: import.meta.env.VITE_ESCALATION_WEBHOOK_URL || deriveEmailUrl(chatUrl) };
}

/** <script data-webhook-url="…" data-email-webhook-url="…"> overrides the build-time values. */
export function configFromScript(script: HTMLScriptElement | null): WidgetConfig {
  const fromEnv = configFromEnv();
  const chatUrl = script?.dataset.webhookUrl || fromEnv.chatUrl;
  const emailUrl =
    script?.dataset.emailWebhookUrl || (script?.dataset.webhookUrl ? deriveEmailUrl(chatUrl) : fromEnv.emailUrl);
  return { chatUrl, emailUrl };
}
