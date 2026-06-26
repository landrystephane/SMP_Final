import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './utils/i18n'
import App from './App.tsx'
import { dataService } from './utils/dataService'
import { initSaaSBridge } from './saasApiBridge'

initSaaSBridge();
dataService.init().catch(console.error);

// Register Service Worker + PWA install prompt
if ('serviceWorker' in navigator && !window.electronAPI) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
window.addEventListener('beforeinstallprompt', (e: any) => {
  e.preventDefault();
  (window as any).__pwaInstallPrompt = e;
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
