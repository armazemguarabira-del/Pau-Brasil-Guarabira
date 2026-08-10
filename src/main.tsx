import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './utils/safeLocalStorage';
import App from './App.tsx';
import { CrossFilterProvider } from './context/CrossFilterContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <CrossFilterProvider>
        <App />
      </CrossFilterProvider>
    </ErrorBoundary>
  </StrictMode>,
);
