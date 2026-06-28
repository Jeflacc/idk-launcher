import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgba(17, 24, 39, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#f1f5f9',
            backdropFilter: 'blur(20px)',
          },
        }}
      />
    </QueryClientProvider>
  );
}
