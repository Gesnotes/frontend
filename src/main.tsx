/**
 * Le suivi des erreurs s'initialise avant le rendu : une exception survenue
 * pendant le premier montage doit être captée elle aussi.
 */
import { initMonitoring } from './monitoring/monitoring';

initMonitoring();

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { createQueryClient } from './api';
import { AuthProvider } from './auth/AuthProvider';
import { AppErrorBoundary } from './monitoring/AppErrorBoundary';
import { UpdatePrompt } from './pwa/UpdatePrompt';
import { StaffAuthProvider } from './staff/StaffAuthProvider';
import { TourProvider } from './tour/TourProvider';
import { ToastProvider } from './ui';
import './index.css';

const queryClient = createQueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <StaffAuthProvider>
              <ToastProvider>
                <TourProvider>
                  <App />
                  <UpdatePrompt />
                </TourProvider>
              </ToastProvider>
            </StaffAuthProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
