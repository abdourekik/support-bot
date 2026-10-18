// Demo shop site (npm run dev). The chat widget is mounted exactly like the
// embeddable script does it, so both behave the same.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { configFromEnv } from './chat/config';
import { mountChatWidget } from './chat/mount';
import { ShopPage } from './shop/ShopPage';
import './shop/shop.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ShopPage />
  </StrictMode>,
);

mountChatWidget(configFromEnv());
