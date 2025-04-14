import React, { ReactNode } from 'react';
import { NotificationProvider } from './NotificationContext';
import { NetworkProvider } from './NetworkContext';
import { TokenProvider } from './TokenContext';
import { ThemeProvider } from './ThemeContext';
import { WhitelistProvider } from './WhitelistContext';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Application providers wrapper component
 * 
 * Wraps the application with all necessary context providers in the correct order:
 * - ThemeProvider (outermost, for theming)
 * - NotificationProvider (needs no dependencies)
 * - WhitelistProvider (for admin access control)
 * - NetworkProvider (depends on notifications)
 * - TokenProvider (depends on networks and notifications)
 */
const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <WhitelistProvider>
          <NetworkProvider>
            <TokenProvider>
              {children}
            </TokenProvider>
          </NetworkProvider>
        </WhitelistProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
};

export default AppProviders; 