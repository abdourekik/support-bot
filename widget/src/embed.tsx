// Entry point of the embeddable script (npm run build:embed).
//
//   <script src="maison-nora-chat.js" data-webhook-url="https://…/webhook/chat" defer></script>
//
// Optional: data-email-webhook-url (defaults to the chat URL with /chat
// replaced by /escalation-email).
import { configFromScript } from './chat/config';
import { mountChatWidget } from './chat/mount';

// document.currentScript is only set while the script runs, so read it now.
const script = document.currentScript as HTMLScriptElement | null;

function start() {
  mountChatWidget(configFromScript(script));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
