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
 * Ensures client-side only rendering for Wagmi/QueryClient contexts.
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
  
  // We need to wait until mounted AND wagmiConfig is available
  // wagmiConfig is null during SSR
  if (!isMounted || !wagmiConfig) {
    // Render a minimal placeholder or null during SSR and initial client render
    // This prevents any child from attempting to access Wagmi/QueryClient contexts prematurely
    return (
      <ThemeProvider> {/* Theme might be okay server-side */} 
         <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           Initializing...
         </div>
       </ThemeProvider>
    );
  }

  // Client-side rendering: Now we know we are mounted AND wagmiConfig exists
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={wagmiConfig}> 
        <ThemeProvider>
          <WhitelistProvider>
            <NetworkProvider>
              <TokenProvider>
                {children} 
              </TokenProvider>
            </NetworkProvider>
          </WhitelistProvider>
        </ThemeProvider>
      </WagmiConfig>
    </QueryClientProvider>
  );
};

export default AppProviders;
