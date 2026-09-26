import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { activeClient } from './config/client';
import './index.css';

const c = activeClient.colours;
const root = document.documentElement.style;
root.setProperty('--brand', c.brand);
root.setProperty('--brand-dark', c.brandDark);
root.setProperty('--brand-soft', c.brandSoft);
root.setProperty('--accent', c.accent);
root.setProperty('--accent-soft', c.accentSoft);
document.title = activeClient.appName;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
