import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Auto-reload on deployment chunk update errors (when new deploy invalidates old hashes)
const handleChunkErrorReload = (key) => {
  const lastReload = sessionStorage.getItem(key);
  const now = Date.now();
  if (!lastReload || now - parseInt(lastReload, 10) > 3000) {
    sessionStorage.setItem(key, now.toString());
    if (typeof window !== 'undefined' && 'caches' in window) {
      caches.keys().then(names => Promise.all(names.map(name => caches.delete(name)))).catch(() => {});
    }
    window.location.reload();
  }
};

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  handleChunkErrorReload('vite_preload_retry');
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason;
  const msg = (reason?.message || '') + ' ' + (reason?.stack || '') + ' ' + String(reason || '');
  if (/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|MIME type of "text\/html"|Loading chunk/i.test(msg)) {
    event.preventDefault();
    handleChunkErrorReload('unhandled_chunk_retry');
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('PWA SW Registered: ', registration);
    }).catch(registrationError => {
      console.log('PWA SW registration failed: ', registrationError);
    });
  });
}
