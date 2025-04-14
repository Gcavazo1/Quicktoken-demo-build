import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import DeployForm from '../components/DeployForm';
import TokenTable from '../components/TokenTable';
import ConfirmDialog from '../components/ConfirmDialog';
import NetworkSelector from '../components/NetworkSelector';
import { useTokens } from '../contexts/TokenContext';
import useNotification from '../hooks/useNotification';
import WalletConnector, { WalletType } from '../services/WalletConnector';
import { QuickTokenConfig } from './SetupWizard';
import { Provider } from '../lib/types/web3';
import { getNetworkName, getNetworkBadgeClass } from '../shared/constants/networks';
import { DeployedToken } from '../lib/types/tokens';
import { useTheme } from '../contexts/ThemeContext';
import { truncateAddress } from '../utils/format';
import { useWhitelist } from '../contexts/WhitelistContext';
import AdminBadge from '../components/AdminBadge';

// Add type definition for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface DashboardProps {
  config: QuickTokenConfig;
  configSource?: 'local' | 'static' | 'none';
  onSwitchView?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  config,
  configSource = 'local',
  onSwitchView
}) => {
  // Theme context
  const { setTheme } = useTheme();
  
  // State for wallet connection
  const [provider, setProvider] = useState<Provider | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = useState<boolean>(false);
  
  // State for selected network
  const [selectedNetworkChainId, setSelectedNetworkChainId] = useState<string>('');
  
  const { showSuccess, showError, showInfo, showWarning, showTransaction } = useNotification();
  
  // Token context
  const {
    tokens,
    ownedTokens,
    isLoading: isTokenLoading,
    error: tokenError,
    deployToken,
    performTokenAction,
    refreshNetworkTokens
  } = useTokens();

  // Get whitelist status to check if the user is whitelisted
  const { isWhitelisted, isOwner } = useWhitelist();

  // Add a state to track if the banner has been dismissed
  const [exportReminderDismissed, setExportReminderDismissed] = useState<boolean>(
    localStorage.getItem('quicktoken_export_reminder_dismissed') === 'true'
  );

  // Apply theme from config when component mounts
  useEffect(() => {
    // Simply update the theme context with the config value
    if (config.theme && (config.theme === 'light' || config.theme === 'dark')) {
      setTheme(config.theme);
    }
  }, [config.theme, setTheme]);

  // Set initial selected network on component mount
  useEffect(() => {
    if (config.networks.configuredNetworks.length > 0) {
      // Find an enabled network to use as default
      const enabledNetworks = config.networks.configuredNetworks.filter(n => n.isEnabled);
      if (enabledNetworks.length > 0) {
        setSelectedNetworkChainId(enabledNetworks[0].chainId);
      }
    }
  }, [config.networks.configuredNetworks]);

  // Check if wallet was previously connected on component mount
  useEffect(() => {
    checkConnection();
    
    // Add event listeners for account and chain changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }
    
    return () => {
      // Clean up event listeners on unmount
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  // Check existing wallet connection
  const checkConnection = async () => {
    const { provider: connectedProvider, account: connectedAccount, chainId: connectedChainId } = 
      await WalletConnector.getConnectionState();
    
    if (connectedProvider && connectedAccount) {
      setProvider(connectedProvider);
      setAccount(connectedAccount);
      setChainId(connectedChainId);
      setWalletType(WalletConnector.getWalletType());
    }
  };

  // Handle account changes from wallet
  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      // User disconnected their wallet
      handleDisconnect();
    } else if (accounts[0] !== account) {
      setAccount(accounts[0]);
    }
  };

  // Handle chain/network changes from wallet
  const handleChainChanged = (chainIdHex: string) => {
    const newChainId = parseInt(chainIdHex, 16);
    setChainId(newChainId);
    
    // Update selected network if it matches one of our configured networks
    const matchingNetwork = config.networks.configuredNetworks.find(
      network => network.chainId === newChainId.toString()
    );
    
    if (matchingNetwork) {
      setSelectedNetworkChainId(matchingNetwork.chainId);
    }
  };

  // Connect wallet
  const handleConnect = async (type: WalletType) => {
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      const { provider: connectedProvider, account: connectedAccount, chainId: connectedChainId, error } = 
        await WalletConnector.connect(type);
      
      if (error) {
        setConnectionError(error);
        return;
      }
      
      if (connectedProvider && connectedAccount) {
        setProvider(connectedProvider);
        setAccount(connectedAccount);
        setChainId(connectedChainId);
        setWalletType(type);
      }
    } catch (error) {
      console.error('Connection error:', error);
      setConnectionError('Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet
  const handleDisconnect = () => {
    WalletConnector.disconnect();
    setProvider(null);
    setAccount(null);
    setChainId(null);
    setWalletType(null);
  };

  // Handle token action
  const handleTokenAction = (token: DeployedToken) => {
    // We can implement token management logic here
    console.log('Managing token:', token);
  };

  // Show reset wizard dialog
  const handleShowResetDialog = () => {
    setShowResetDialog(true);
  };

  // Handle reset wizard confirmation
  const handleResetConfirm = () => {
    // Remove localStorage items and reload
    try {
      // Clear all QuickToken related items
      localStorage.removeItem('quicktoken_setup_complete');
      localStorage.removeItem('quicktoken_config');
      localStorage.removeItem('quicktokens');
      localStorage.removeItem('quicktoken_theme'); // Remove theme setting
      
      // Force reset to light theme before reload
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
      
      showInfo('Settings reset. Returning to setup wizard...');
      
      // Ensure localStorage is cleared before reload by using a synchronous approach
      setTimeout(() => {
        window.location.href = window.location.pathname; // Force a clean reload
      }, 1500);
    } catch (error) {
      console.error('Failed to reset settings:', error);
      showError('Failed to reset settings. Please try again.');
    }
    
    setShowResetDialog(false);
  };

  // Handle reset wizard cancellation
  const handleResetCancel = () => {
    setShowResetDialog(false);
  };

  // Handle network selection
  const handleNetworkSelect = async (chainIdStr: string) => {
    setSelectedNetworkChainId(chainIdStr);
    
    // Convert string chainId to number
    const selectedChainIdNum = parseInt(chainIdStr);
    
    // If connected to wallet and current chain doesn't match selected, try to switch
    if (isConnected && chainId !== null && selectedChainIdNum !== chainId) {
      try {
        // Find the network in configured networks
        const network = config.networks.configuredNetworks.find(n => n.chainId === chainIdStr);
        
        if (!network) {
          showWarning('Selected network is not configured');
          return;
        }
        
        // Request chain switch in wallet
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${parseInt(chainIdStr).toString(16)}` }],
          });
          
          // Chain switch successful, refresh tokens
          setTimeout(() => {
            refreshNetworkTokens();
          }, 1000); // Small delay to ensure chain is fully switched
        } catch (switchError: any) {
          // Chain doesn't exist in wallet, try to add it
          if (switchError.code === 4902) {
            try {
              const addChainParam = {
                chainId: `0x${parseInt(chainIdStr).toString(16)}`,
                chainName: network.name,
                nativeCurrency: {
                  name: 'Ether',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: [network.rpcUrl],
                blockExplorerUrls: network.explorerUrl ? [network.explorerUrl] : undefined
              };
              
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [addChainParam],
              });
              
              // Chain add successful, refresh tokens after a delay
              setTimeout(() => {
                refreshNetworkTokens();
              }, 1000); // Small delay to ensure network is fully added
            } catch (error) {
              console.error('Failed to add network:', error);
              showWarning(`Failed to add network: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          } else {
            throw switchError;
          }
        }
      } catch (error: any) {
        console.error('Failed to switch network:', error);
        showWarning(`Failed to switch network: ${error.message}`);
      }
    }
  };

  // Check if wallet is connected
  const isConnected = !!account && !!provider;

  // Get network from selected chain ID
  const selectedNetwork = config.networks.configuredNetworks.find(
    network => network.chainId === selectedNetworkChainId
  );

  // Add a function to dismiss the reminder
  const dismissExportReminder = () => {
    localStorage.setItem('quicktoken_export_reminder_dismissed', 'true');
    setExportReminderDismissed(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-primary text-primary">
      {/* Header */}
      <header className="bg-secondary border-b border-border shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">
                {config.branding.title}
              </h1>
              <div className="flex ml-4 gap-2">
                {isWhitelisted && (
                  <button
                    onClick={handleShowResetDialog}
                    className="flex items-center text-sm text-secondary bg-tertiary px-3 py-1 rounded-md border border-border hover:bg-hover transition-colors"
                    title="Reset to setup wizard"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset Wizard
                  </button>
                )}
                <button
                  onClick={() => showSuccess('Test notification system!')}
                  className="flex items-center text-sm text-blue-400 bg-tertiary px-3 py-1 rounded-md border border-border hover:bg-hover transition-colors"
                  title="Test the notification system"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Test Notification
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NetworkSelector
                currentChainId={chainId ? parseInt(chainId.toString()) : null}
                onNetworkChange={(newChainId) => handleNetworkSelect(newChainId.toString())}
                showTestnets={true}
                className="w-60"
              />
              {isConnected && (
                <div className="flex items-center">
                  {/* Account info */}
                  <div className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg shadow-sm border dark:border-gray-600 flex items-center">
                    <span className="px-3 py-2 flex items-center text-sm font-medium">
                      {walletType === 'metamask' && (
                        <img 
                          src="/images/metamask-logo.png" 
                          alt="MetaMask" 
                          className="h-4 w-4 mr-1.5 object-contain" 
                        />
                      )}
                      {walletType === 'coinbase' && (
                        <img 
                          src="/images/coinbase-logo.png" 
                          alt="Coinbase Wallet" 
                          className="h-4 w-4 mr-1.5 object-contain" 
                        />
                      )}
                      {walletType === 'wallet-connect' && (
                        <img 
                          src="/images/walletconnect-logo.png" 
                          alt="WalletConnect" 
                          className="h-4 w-4 mr-1.5 object-contain" 
                        />
                      )}
                      {truncateAddress(account)}
                      {isWhitelisted && <AdminBadge className="ml-2" />}
                    </span>
                    
                    {/* Disconnect button */}
                    <button
                      onClick={handleDisconnect}
                      className="border-l dark:border-gray-600 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors rounded-r-lg"
                      aria-label="Disconnect wallet"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1">
        {/* Export Configuration Reminder for Admins */}
        {isWhitelisted && !exportReminderDismissed && configSource === 'local' && (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-5 mb-6 flex justify-between items-center">
            <div className="flex-1">
              <h3 className="text-yellow-800 font-bold text-lg">Important Administrator Action Required</h3>
              <p className="text-yellow-700 mt-1">
                Your dashboard setup is complete, but you need to export your configuration to make it available to all users.
                Without this critical step, other users will see the setup wizard instead of your configured dashboard.
              </p>
              <ul className="list-disc ml-5 mt-2 text-yellow-700">
                <li className="mb-1">Go to Settings → Export Configuration tab</li>
                <li className="mb-1">Download the configuration file</li>
                <li className="mb-1">Add it to your project at <code className="px-1.5 py-0.5 bg-yellow-100 rounded text-sm font-mono">/public/dashboard-config.json</code></li>
                <li>Deploy the updated project to your hosting provider</li>
              </ul>
            </div>
            <div className="flex flex-col space-y-2 ml-4">
              <button 
                onClick={onSwitchView} 
                className="px-4 py-2 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 font-medium"
              >
                Go to Settings →
              </button>
              <button 
                onClick={dismissExportReminder}
                className="px-2 py-1 text-yellow-700 text-sm hover:text-yellow-900"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        
        {isConnected ? (
          <div className="flex flex-col gap-6">
            {connectionError && (
              <div className="bg-red-900/30 border border-red-800 text-red-200 p-4 rounded-lg">
                {connectionError}
              </div>
            )}
            
            {tokenError && (
              <div className="bg-red-900/30 border border-red-800 text-red-200 p-4 rounded-lg">
                {tokenError}
              </div>
            )}
            
            {/* Deploy Form */}
            <div id="deploy-section" className="bg-secondary rounded-lg overflow-hidden border border-border shadow-md">
              <div className="px-6 py-5 border-b border-border flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-medium text-primary">
                    Deploy New Token
                  </h2>
                  <p className="mt-1 text-sm text-secondary">
                    Create and deploy a new QuickToken ERC-20 contract
                  </p>
                </div>
                <div className="text-sm text-secondary">
                  <span className="bg-tertiary px-2 py-1 rounded text-blue-400 font-medium">
                    {chainId ? getNetworkName(chainId) : 'Not Connected'}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <DeployForm
                  provider={provider}
                  account={account}
                  chainId={chainId}
                  onDeploySuccess={() => {
                    // Token state is managed by TokenContext
                  }}
                  config={config}
                />
              </div>
            </div>
            
            {/* Token Table */}
            <div className="bg-secondary rounded-lg overflow-hidden border border-border shadow-md">
              <div className="px-6 py-5 border-b border-border">
                <h2 className="text-lg font-medium text-primary">
                  Your Tokens
                </h2>
                <p className="mt-1 text-sm text-secondary">
                  Manage your deployed ERC-20 tokens
                </p>
              </div>
              <div>
                <TokenTable
                  provider={provider}
                  onManageToken={handleTokenAction}
                  account={account}
                  tokens={ownedTokens}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2 text-primary">Connect Your Wallet</h2>
              <p className="text-secondary max-w-lg">
                Connect your wallet to deploy and manage ERC-20 tokens.
                Choose from the supported wallet providers below.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
              {config.wallets.metamask && (
                <button
                  onClick={() => handleConnect('metamask')}
                  disabled={isConnecting}
                  className="bg-secondary hover:bg-hover border border-border rounded-lg p-4 text-left transition-colors"
                >
                  <div className="flex items-center mb-2">
                    <img 
                      src="/images/metamask-logo.png" 
                      alt="MetaMask" 
                      className="w-8 h-8 mr-3" 
                    />
                  </div>
                  <p className="text-sm text-secondary">
                    Connect using MetaMask browser extension
                  </p>
                </button>
              )}
              
              {config.wallets.coinbase && (
                <button
                  onClick={() => handleConnect('coinbase')}
                  disabled={isConnecting}
                  className="bg-secondary hover:bg-hover border border-border rounded-lg p-4 text-left transition-colors"
                >
                  <div className="flex items-center mb-2">
                    <img 
                      src="/images/coinbase-logo.png" 
                      alt="Coinbase Wallet" 
                      className="w-8 h-8 mr-3" 
                    />
                  </div>
                  <p className="text-sm text-secondary">
                    Connect with Coinbase Wallet
                  </p>
                </button>
              )}
              
              {config.wallets.walletconnect && (
                <button
                  onClick={() => handleConnect('wallet-connect')}
                  disabled={isConnecting}
                  className="bg-secondary hover:bg-hover border border-border rounded-lg p-4 text-left transition-colors"
                >
                  <div className="flex items-center mb-2">
                    <img
                      src="/images/walletconnect-logo.png"
                      alt="WalletConnect"
                      className="w-8 h-8 mr-3"
                    />
                  </div>
                  <p className="text-sm text-secondary">
                    Connect with WalletConnect
                  </p>
                </button>
              )}
            </div>
            
            {isConnecting && (
              <div className="mt-6 flex items-center text-secondary">
                <svg className="animate-spin h-5 w-5 mr-2 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              </div>
            )}
            
            {connectionError && (
              <div className="mt-6 p-3 bg-red-900/30 border border-red-800 text-red-200 rounded-md max-w-2xl">
                {connectionError}
              </div>
            )}
          </div>
        )}
      </main>
      
      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResetDialog}
        title="Reset Dashboard Configuration"
        message="This is an admin-only action that will completely reset your dashboard configuration. All settings, including whitelisted admin addresses, platform fee configuration, network settings, and theme preferences will be cleared, and you'll be redirected to the setup wizard. Note: This action cannot be undone."
        confirmText="Yes, Reset Everything"
        cancelText="Cancel"
        onConfirm={handleResetConfirm}
        onCancel={handleResetCancel}
        variant="danger"
      />
    </div>
  );
};

export default Dashboard; 