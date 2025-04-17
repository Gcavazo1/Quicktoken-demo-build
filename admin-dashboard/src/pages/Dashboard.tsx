import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import DeployForm from '../components/DeployForm';
import TokenTable from '../components/TokenTable';
import ConfirmDialog from '../components/ConfirmDialog';
import NetworkSelector from '../components/NetworkSelector';
import { useTokens } from '../contexts/TokenContext';
import { WalletConnector, EIP6963ProviderDetail, EIP6963ProviderInfo } from '../services/WalletConnector';
import { QuickTokenConfig } from './SetupWizard';
import { getNetworkName, getNetworkBadgeClass } from '../shared/constants/networks';
import { DeployedToken } from '../lib/types/tokens';
import { useTheme } from '../contexts/ThemeContext';
import { truncateAddress } from '../utils/format';
import { useWhitelist } from '../contexts/WhitelistContext';
import AdminBadge from '../components/AdminBadge';
import { Button } from '../components/Button';
import { Loader2 } from 'lucide-react';
import WalletSelectorModal from '../components/WalletSelectorModal';
import { useWallet } from '../hooks/useWallet';
import { useNetwork, NetworkType } from '../contexts/NetworkContext';
import Notification from '../components/Notification';
import { useNotification } from '../contexts/NotificationContext';
import NetworkSwitch from '../components/NetworkSwitch';
import Header from '../components/Header';
import ImportTokenModal from '../components/ImportTokenModal';

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
  // --- STATE HOOKS ---
  const { setTheme } = useTheme();
  const [showResetDialog, setShowResetDialog] = useState<boolean>(false);
  const [showWalletSelector, setShowWalletSelector] = useState<boolean>(false);
  const [availableProviders, setAvailableProviders] = useState<EIP6963ProviderDetail[]>([]);
  const [tokens, setTokens] = useState<DeployedToken[]>([]);
  const { isWhitelisted, isOwner } = useWhitelist();
  const { address: account, provider, isConnected, isInitializing } = useWallet();
  const { currentNetwork, configuredNetworks } = useNetwork();
  const { addNotification } = useNotification();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // --- OTHER HOOKS & INSTANCES ---
  const {
    ownedTokens,
    isLoading: isTokenLoading,
    error: tokenError,
    deployToken,
    performTokenAction,
    refreshNetworkTokens,
    ownedNetworkTokens
  } = useTokens();
  const connector = WalletConnector;
  const wallet = useWallet();
  const { setNetwork: setContextNetwork } = useNetwork();

  // --- Add Helper Function from WalletSelectorModal --- 
  const getWalletIcon = (providerInfo: EIP6963ProviderInfo): string => {
    // Prioritize specific RDNS matches for custom icons
    if (providerInfo.rdns === 'io.metamask') {
      return '/images/metamask-logo.png';
    }
    if (providerInfo.rdns === 'com.coinbase.wallet') {
      return '/images/coinbase-logo.png';
    }
  
    // If no RDNS match, try to use the provided icon if it seems valid
    const isValidIcon = providerInfo.icon && (providerInfo.icon.startsWith('data:image') || /\.(svg|png|jpe?g|webp)$/i.test(providerInfo.icon));
    if (isValidIcon) {
      return providerInfo.icon;
    }
    
    // Final fallback: return original icon or a default placeholder
    // return '/images/default-wallet.png'; // Example placeholder
    return providerInfo.icon; // Return original icon data even if it might not render
  };

  // --- CALLBACK HOOKS ---
  const handleTokenAction = (token: DeployedToken) => {
    // console.log('Managing token:', token);
  };

  const handleShowResetDialog = () => {
    setShowResetDialog(true);
  };

  const handleResetConfirm = () => {
    try {
      localStorage.removeItem('quicktoken_setup_complete');
      localStorage.removeItem('quicktoken_config');
      localStorage.removeItem('quicktokens');
      localStorage.removeItem('quicktoken_theme');
      
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
      
      console.log('Settings reset. Returning to setup wizard...');
      
      setTimeout(() => {
        window.location.href = window.location.pathname;
      }, 1500);
    } catch (error) {
      console.error('Failed to reset settings:', error);
      console.log('Failed to reset settings. Please try again.');
    }
    setShowResetDialog(false);
  };

  const handleResetCancel = () => {
    setShowResetDialog(false);
  };

  const handleNetworkSelect = async (chainIdStr: string) => {
    const targetNetwork = config.networks.configuredNetworks.find(n => n.chainId === chainIdStr);
    if (targetNetwork) {
      const networkInfo: NetworkType = {
        chainId: parseInt(targetNetwork.chainId),
        name: targetNetwork.name,
        shortName: targetNetwork.shortName || targetNetwork.name,
        isTestnet: targetNetwork.testnet ?? false,
        testnet: targetNetwork.testnet ?? false,
        currency: {
          name: targetNetwork.currencySymbol || 'ETH',
          symbol: targetNetwork.currencySymbol || 'ETH',
          decimals: 18
        },
        rpcUrl: targetNetwork.rpcUrl || '',
        blockExplorerUrl: targetNetwork.explorerUrl || '',
        explorerUrl: targetNetwork.explorerUrl || ''
      };
      await setContextNetwork(networkInfo);
    } else {
      console.log(`Network with ID ${chainIdStr} not found in configuration.`);
    }
  };

  const handleProvidersUpdate = useCallback(() => {
    const connectorInstance = WalletConnector.getInstance();
    const providersMap = connectorInstance.getDiscoveredProviders();
    setAvailableProviders(Array.from(providersMap.values()));
    if (providersMap.size === 0 && !connectorInstance.isDiscoveryComplete()) {
      console.log("Discovering wallets... Please wait a moment.");
    }
    setShowWalletSelector(true);
  }, []);

  const handleShowWalletSelector = useCallback(() => {
    const connectorInstance = WalletConnector.getInstance();
    const providersMap = connectorInstance.getDiscoveredProviders();
    setAvailableProviders(Array.from(providersMap.values()));
    if (providersMap.size === 0 && !connectorInstance.isDiscoveryComplete()) {
      console.log("Discovering wallets... Please wait a moment.");
    }
    setShowWalletSelector(true);
  }, []);

  // --- SIDE EFFECTS HOOK ---
  useEffect(() => {
    window.addEventListener('walletProvidersUpdated', handleProvidersUpdate);
    return () => {
      window.removeEventListener('walletProvidersUpdated', handleProvidersUpdate);
    };
  }, [handleProvidersUpdate]);

  useEffect(() => {
      if (config.theme && (config.theme === 'light' || config.theme === 'dark')) {
        setTheme(config.theme);
      }
  }, [config.theme, setTheme]);

  useEffect(() => {
    const allTokensByNetwork = loadTokensByNetwork();
    const currentChainId = currentNetwork?.chainId ? parseInt(currentNetwork.chainId, 10) : null;
    if (currentChainId) {
      setTokens(allTokensByNetwork[currentChainId] || []);
    } else {
      setTokens([]); // Clear tokens if no network is selected
    }
    console.log(`[Dashboard] Tokens loaded for chainId: ${currentChainId}`);
  }, [currentNetwork]);

  // --- RENDER ---
  return (
    <div className="min-h-screen flex flex-col bg-primary text-primary">
      <Header config={config} />
      
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1">
        {wallet.isConnected ? (
          <div className="flex flex-col gap-6">
            {wallet.error && (
              <div className="bg-red-900/30 border border-red-800 text-red-200 p-4 rounded-lg">
                {wallet.error}
              </div>
            )}
            
            {tokenError && (
              <div className="bg-red-900/30 border border-red-800 text-red-200 p-4 rounded-lg">
                {tokenError}
              </div>
            )}
            
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
                    {currentNetwork?.name || (wallet.chainId ? getNetworkName(wallet.chainId) : 'Not Connected')}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <DeployForm
                  provider={wallet.provider}
                  account={wallet.address}
                  chainId={wallet.chainId}
                  onSubmitDeployment={deployToken}
                  config={config}
                />
              </div>
            </div>
            
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
                  provider={wallet.provider}
                  account={wallet.address}
                  tokens={ownedNetworkTokens}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold text-primary mb-4">Wallet Not Connected</h2>
            <p className="text-secondary mb-6">Please connect your wallet to manage tokens.</p>
            <Button
              onClick={handleShowWalletSelector}
              disabled={wallet.isConnecting}
              variant="default"
              size="lg"
            >
              {wallet.isConnecting ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : null}
              {wallet.isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
            {wallet.error && (
              <div className="mt-6 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-200 rounded-md max-w-md mx-auto">
                {wallet.error}
              </div>
            )}
          </div>
        )}
      </main>
      
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

      <WalletSelectorModal
        isOpen={showWalletSelector}
        onClose={() => setShowWalletSelector(false)}
        providers={availableProviders}
        onConnect={(providerDetail) => wallet.connectWallet(providerDetail.info.rdns)}
        isLoading={wallet.isConnecting}
      />

      <ImportTokenModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};

export default Dashboard; 