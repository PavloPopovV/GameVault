import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
// Піксельний шрифт лого — у бандлі (лише латиниця), без залежності від Google Fonts
import '@fontsource/press-start-2p/latin-400.css';
import './styles/main.scss';

// Заломлення «рідкого скла» (SVG у backdrop-filter) підтримує лише Chromium — вмикаємо там класом
if (navigator.userAgentData?.brands?.some((b) => b.brand === 'Chromium')) {
  document.documentElement.classList.add('liquid-refraction');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
