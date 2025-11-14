"use client";

import * as React from "react";
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/store/store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { UserProvider } from '@/contexts/UserContext';

const queryClient = new QueryClient();

interface ProvidersProps {
  children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <UserProvider>
              <SonnerToaster />
              {children}
            </UserProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  );
}