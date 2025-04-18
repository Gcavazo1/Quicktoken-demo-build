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
  
  // Create a client for React Query (safe to create server-side, just not provided)
  const [queryClient] = useState(() => new QueryClient());

  // Set mounted state after component mounts on client
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Render null or a loader until mounted on the client
  // This prevents children from rendering prematurely without necessary providers
  if (!isMounted) {
    // Option: Render null (may cause layout shift briefly)
    // return null;
    // Option: Render a simple loader/placeholder
    return (
      <ThemeProvider> {/* Theme might be okay server-side */} 
         <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           Loading Dashboard...
         </div>
       </ThemeProvider>
    );
  }

  // Client-side rendering: Render all providers AND the children
  return (
    <QueryClientProvider client={queryClient}>
      {/* Render WagmiConfig only if wagmiConfig is not null (which it is on server) */} 
      {wagmiConfig ? (
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
       ) : (
         // Fallback if wagmiConfig is somehow null on client (shouldn't happen with isMounted check)
         <ThemeProvider>
           <WhitelistProvider>
             <NetworkProvider>
               <TokenProvider>
                 {children}
               </TokenProvider>
             </NetworkProvider>
           </WhitelistProvider>
         </ThemeProvider>
       )}
    </QueryClientProvider>
  );
};

export default AppProviders;
