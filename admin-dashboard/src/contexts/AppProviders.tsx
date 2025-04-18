import React, { ReactNode, useState, useEffect } from 'react';
import { NetworkProvider } from './NetworkContext';
import { TokenProvider } from './TokenContext';
import { ThemeProvider } from './ThemeContext';
import { WhitelistProvider } from './WhitelistContext';

// --- Import Wagmi config and provider ---
import { WagmiConfig } from 'wagmi';
import { wagmiConfig } from '../lib/web3Config'; // Adjusted import path

// --- Import QueryClientProvider for TanStack Query ---
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Application providers wrapper component
 * 
 * Wraps the application with all necessary context providers including Wagmi.
 */
const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  // State to track if component is mounted (client-side)
  const [isMounted, setIsMounted] = useState(false);
  
  // Create a client for React Query
  const [queryClient] = useState(() => new QueryClient());

  // Set mounted state after component mounts on client
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // During SSR, render without Wagmi to avoid errors
  if (!isMounted) {
    return (
      <ThemeProvider>
        <WhitelistProvider>
          <NetworkProvider>
            <TokenProvider>
              {children}
            </TokenProvider>
          </NetworkProvider>
        </WhitelistProvider>
      </ThemeProvider>
    );
  }

  // Client-side rendering with all providers
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={wagmiConfig}>
        <ThemeProvider>
          {/* <NotificationProvider> */}{/* Removed */}
            <WhitelistProvider>
              <NetworkProvider>
                <TokenProvider>
                  {children}
                </TokenProvider>
              </NetworkProvider>
            </WhitelistProvider>
          {/* </NotificationProvider> */}{/* Removed */}
        </ThemeProvider>
      </WagmiConfig>
    </QueryClientProvider>
  );
};

export default AppProviders;
