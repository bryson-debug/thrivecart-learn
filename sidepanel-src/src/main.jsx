import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelpScoutContextProvider } from '@helpscout/ui-kit';
import App from './App';
import ErrorBoundary from './ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HelpScoutContextProvider>
        <App />
      </HelpScoutContextProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
