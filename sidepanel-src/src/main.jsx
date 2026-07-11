import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelpScoutContextProvider } from '@helpscout/ui-kit';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelpScoutContextProvider>
      <App />
    </HelpScoutContextProvider>
  </React.StrictMode>,
);
