import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Settings from '../../pages/settings';
import SetupWizard, { QuickTokenConfig } from './pages/SetupWizard';
import AppProviders from './contexts/AppProviders';
import { loadStaticConfiguration } from './utils/configImport';
import './styles/index.css';

// --- Web3Modal Initialization ---
import { createWeb3Modal } from '@web3modal/wagmi';
import { wagmiConfig } from './lib/web3Config';
import { mainnet, sepolia, goerli, polygon, polygonMumbai, bsc, bscTestnet, arbitrum, avalanche, base, optimism, fantom, baseGoerli, gnosis, zkSync, linea, scroll } from 'wagmi/chains';

// 1. Get Project ID
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// Define supported chains (ensure this matches web3Config.ts)
const supportedChains = [
  mainnet, goerli, sepolia, polygon, polygonMumbai, bsc, bscTestnet,
  arbitrum, avalanche, base, optimism, fantom, baseGoerli, gnosis,
  zkSync, linea, scroll
] as const;

// Define metadata (ensure this matches web3Config.ts)
const metadata = {
  name: 'QuickToken Dashboard',
  description: 'Deploy and manage your ERC-20 tokens',
  url: 'https://quicktoken-dashboard-demo.vercel.app/',
  icons: []
};

// Call createWeb3Modal here, but outside the component render cycle
// It needs to be called once
if (projectId) {
  createWeb3Modal({
    wagmiConfig,
    projectId,
    featuredWalletIds: [],
    themeMode: 'light',
    themeVariables: {},
    metadata
  });
} else {
  console.error("WalletConnect Project ID (NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) is not set. Web3Modal will not function.");
}
// --- End Web3Modal Initialization ---

// Helper function to apply branding settings to CSS variables
const applyBrandingStyles = (config: QuickTokenConfig) => {
  // Set dashboard title
  document.documentElement.style.setProperty('--dashboard-title', `'${config.branding.title || 'QuickToken Dashboard'}'`);
  
  // Update page title
  document.title = config.branding.title || 'QuickToken Dashboard';
};

const App: React.FC = () => {
  const [setupComplete, setSetupComplete] = useState<boolean>(false);
  const [config, setConfig] = useState<QuickTokenConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'settings'>('dashboard');
  const [configSource, setConfigSource] = useState<'local' | 'static' | 'none'>('none');
  const [isNewSetup, setIsNewSetup] = useState<boolean>(false);

  useEffect(() => {
    async function initializeConfig() {
      try {
        // First, try to load configuration from static file
        const staticConfigResult = await loadStaticConfiguration();
        
        if (staticConfigResult.success && staticConfigResult.config) {
          // If static config loaded successfully, use it
          setConfig(staticConfigResult.config.core);
          setConfigSource('static');
          setSetupComplete(true);
          
          // Apply branding settings
          applyBrandingStyles(staticConfigResult.config.core);
          setIsLoading(false);
          return;
        }
        
        // If no static config, check localStorage
        const setupCompleted = localStorage.getItem('quicktoken_setup_complete') === 'true';
        
        if (setupCompleted) {
          const savedConfig = localStorage.getItem('quicktoken_config');
          if (savedConfig) {
            try {
              const parsedConfig = JSON.parse(savedConfig);
              setConfig(parsedConfig);
              setConfigSource('local');
              
              // Apply branding settings to CSS variables
              applyBrandingStyles(parsedConfig);
            } catch (e) {
              console.error('Failed to parse saved configuration:', e);
              // Invalid config data, treat as not set up
              localStorage.removeItem('quicktoken_setup_complete');
              localStorage.removeItem('quicktoken_config');
              setSetupComplete(false);
              setConfigSource('none');
              setIsLoading(false);
              return;
            }
          } else {
            // Config missing, treat as not set up
            localStorage.removeItem('quicktoken_setup_complete');
            setSetupComplete(false);
            setConfigSource('none');
            setIsLoading(false);
            return;
          }
        }
        
        setSetupComplete(setupCompleted);
      } catch (error) {
        console.error('Error initializing configuration:', error);
        // Fallback to localStorage check on error
        const setupCompleted = localStorage.getItem('quicktoken_setup_complete') === 'true';
        setSetupComplete(setupCompleted);
        if (setupCompleted) {
          setConfigSource('local');
        }
      }
      
      setIsLoading(false);
    }
    
    initializeConfig();
  }, []);

  const handleSetupComplete = (config: QuickTokenConfig) => {
    saveConfig(config);
    setConfig(config);
    setSetupComplete(true);
    setConfigSource('local');
    applyBrandingStyles(config);
  };

  // Save configuration to localStorage
  const saveConfig = (config: QuickTokenConfig) => {
    localStorage.setItem('quicktoken_setup_complete', 'true');
    localStorage.setItem('quicktoken_config', JSON.stringify(config));
  };

  // Update configuration
  const handleConfigUpdate = (updatedConfig: QuickTokenConfig) => {
    saveConfig(updatedConfig);
    setConfig(updatedConfig);
    
    // Apply updated branding settings
    applyBrandingStyles(updatedConfig);
  };

  // Reset setup for both development and production
  const resetSetup = () => {
    // Clear all QuickToken related data
    localStorage.removeItem('quicktoken_setup_complete');
    localStorage.removeItem('quicktoken_config');
    localStorage.removeItem('quicktokens');
    localStorage.removeItem('quicktoken_whitelist_config');
    localStorage.removeItem('quicktoken_config_imported');
    localStorage.removeItem('quicktoken_config_imported_at');
    
    setSetupComplete(false);
    setConfig(null);
    setConfigSource('none');
    setCurrentView('dashboard');
    
    // Force reload to ensure clean state
    window.location.href = window.location.pathname;
  };

  // Toggle between Dashboard and Settings
  const toggleView = () => {
    setCurrentView(currentView === 'dashboard' ? 'settings' : 'dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // Navigation header if setup is complete
  const NavigationHeader = () => (
    <div className="py-2" style={{ backgroundColor: 'var(--primary-color)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="text-lg font-semibold text-white">{config?.branding.title || 'QuickToken'}</h1>
          
          {/* Config source indicator */}
          {configSource === 'static' && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-600 text-white rounded">Shared Config</span>
          )}
        </div>
        <div>
          <button 
            onClick={toggleView}
            className="text-white hover:bg-white hover:bg-opacity-20 px-3 py-1 rounded-md text-sm transition-colors"
          >
            {currentView === 'dashboard' ? (
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </span>
            ) : (
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <AppProviders>
      <div className="min-h-screen">
        {isLoading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="loading-spinner"></div>
          </div>
        ) : setupComplete && config ? (
          <>
            {/* Navigation header */}
            <NavigationHeader />
            
            {/* Main content */}
            {currentView === 'dashboard' ? (
              <Dashboard 
                config={config} 
                configSource={configSource} 
                onSwitchView={() => setCurrentView('settings')}
              />
            ) : (
              <Settings />
            )}
          </>
        ) : (
          <SetupWizard onComplete={handleSetupComplete} />
        )}
      </div>
    </AppProviders>
  );
};

export default App; 