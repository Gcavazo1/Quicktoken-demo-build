import React, { ReactNode } from 'react';
import { NetworkProvider } from './NetworkContext';
import { TokenProvider } from './TokenContext';
import { ThemeProvider } from './ThemeContext';
import { WhitelistProvider } from './WhitelistContext';

// --- Import Wagmi config and provider ---
import { WagmiConfig } from 'wagmi';
import { wagmiConfig } from '../lib/web3Config'; // Adjusted import path

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Application providers wrapper component
 * 
 * Wraps the application with all necessary context providers including Wagmi.
 */
const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
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
  );
};

export default AppProviders;
