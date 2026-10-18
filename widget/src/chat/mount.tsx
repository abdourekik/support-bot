import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ChatWidget } from './ChatWidget';
import styles from './chat.css?inline';
import type { WidgetConfig } from './types';

/**
 * Mount the widget in its own Shadow DOM, so it looks the same on any site.
 * Used by the demo page (main.tsx) and by the embeddable script (embed.tsx).
 */
export function mountChatWidget(config: WidgetConfig): Root {
  const existing = document.getElementById('maison-nora-chat');
  existing?.remove();

  const host = document.createElement('div');
  host.id = 'maison-nora-chat';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = styles;
  shadow.appendChild(style);

  const container = document.createElement('div');
  shadow.appendChild(container);

  const root = createRoot(container);
  root.render(
    <StrictMode>
      <ChatWidget config={config} />
    </StrictMode>,
  );
  return root;
}
