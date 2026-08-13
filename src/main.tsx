import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// The Tauri window loads from http://localhost:3000, so all fetch("/api/...")
// calls go directly to the Express backend — no IPC proxy needed.
// The old invoke("api_request", ...) wrapper has been removed.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
