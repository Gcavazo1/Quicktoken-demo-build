import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { NETWORKS, NetworkInfo, getNetworkName, getExplorerUrl, getNetworkBadgeClass } from '../shared/constants/networks';
import { useWallet } from '../hooks/useWallet';

// Define context type
interface NetworkContextType {
  currentNetwork: NetworkInfo | null;
  setNetwork: (network: NetworkInfo) => Promise<boolean>;
  isChangingNetwork: boolean;
  getNetworkByChainId: (chainId: number) => NetworkInfo | undefined;
  configuredNetworks: NetworkInfo[];
  getNetworkColor: (chainId: number) => string;
  getNetworkName: (chainId: number) => string;
  getExplorerUrl: (chainId: number, address: string, type?: 'tx' | 'address' | 'token') => string;
  isConfigLoading: boolean;
}

// Export NetworkType as an alias to NetworkInfo for backward compatibility 
export type NetworkType = NetworkInfo;

// Convert NETWORKS object to our format with expanded currency info if needed
const convertToExpandedNetworks = (): NetworkInfo[] => {
  return Object.values(NETWORKS).map(network => {
    // If currency is already an object, just return the network as is
    if (typeof network.currency !== 'string') {
      return network;
    }
    
    // Otherwise, expand the currency string to an object
    return {
      ...network,
      currency: {
        name: network.currency,
        symbol: network.currency,
        decimals: 18
      }
    };
  });
};

// Create context with default values
const NetworkContext = createContext<NetworkContextType>({
  currentNetwork: null,
  setNetwork: async () => false,
  isChangingNetwork: false,
  getNetworkByChainId: () => undefined,
  configuredNetworks: [],
  getNetworkColor: () => 'text-gray-500',
  getNetworkName: () => 'Unknown Network',
  getExplorerUrl: () => '#',
  isConfigLoading: true,
});

// Custom hook to use the network context
export const useNetwork = () => useContext(NetworkContext);

interface NetworkProviderProps {
  children: ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
  // State to track if component is mounted (client-side)
  const [isMounted, setIsMounted] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState<NetworkInfo | null>(null);
  const [isChangingNetwork, setIsChangingNetwork] = useState(false);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [loadedConfiguredNetworks, setLoadedConfiguredNetworks] = useState<NetworkInfo[]>([]);
  
  // Set mounted state after component mounts on client
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Only access useWallet if we're mounted on client side
  const wallet = useWallet();
  
  // Safely extract wallet properties with defaults
  const isConnected = wallet?.isConnected || false;
  const walletChainId = wallet?.chainId || null;
  const walletChangeNetwork = wallet?.changeNetwork || (async () => false);
  
  // Function to load/parse config from storage and update state
  const loadAndSetConfig = useCallback(() => {
      if (typeof window === 'undefined') return; // Skip on server side
      
      console.log('[NetworkContext] Executing loadAndSetConfig...');
      let networks: NetworkInfo[] = [];
      let isLoading = true;
      try {
        const configString = localStorage.getItem('quicktoken_config');
        if (configString) {
          const config = JSON.parse(configString);
          const enabledNetworksConfig = config?.networks?.configuredNetworks;
          
          if (Array.isArray(enabledNetworksConfig)) {
            networks = enabledNetworksConfig.map((netConf: any): NetworkInfo => ({
                chainId: parseInt(netConf.chainId),
                name: netConf.name,
                shortName: netConf.shortName || netConf.name,
                isTestnet: netConf.testnet ?? false, 
                testnet: netConf.testnet ?? false,
                currency: { 
                  name: netConf.currencySymbol || 'ETH', 
                  symbol: netConf.currencySymbol || 'ETH',
                  decimals: 18 
                },
                rpcUrl: netConf.rpcUrl || '', 
                blockExplorerUrl: netConf.explorerUrl || '',
                explorerUrl: netConf.explorerUrl || '' 
            }));
            console.log('[NetworkContext] Parsed networks:', networks);
          } else {
            console.log('[NetworkContext] No configured networks found in config or config structure invalid.');
          }
        } else {
            console.log('[NetworkContext] No quicktoken_config found in localStorage.');
        }
      } catch (error) {
        console.error('Error loading/parsing network configuration from localStorage:', error);
      } finally {
          console.log('[NetworkContext] loadAndSetConfig finished. Setting networks and loading state.');
          setLoadedConfiguredNetworks(networks); // Update state with parsed networks (or empty array)
          setIsConfigLoading(false); // Set loading false *after* processing
      }
  }, []); // No dependencies, relies on being called explicitly or by listeners

  // Effect for initial loading 
  useEffect(() => {
    // Skip on server side
    if (typeof window === 'undefined') return;
    
    console.log('[NetworkContext] Initial mount effect running.');
    loadAndSetConfig(); // Call the loading function on mount
  }, [loadAndSetConfig]); // Depend on the memoized loading function

  // Effect to listen for storage changes
  useEffect(() => {
      // Skip on server side
      if (typeof window === 'undefined') return;
      
      const handleStorageChange = (event: StorageEvent) => {
          const CONFIG_STORAGE_KEY = 'quicktoken_config'; // Correct key
          if (event.key === CONFIG_STORAGE_KEY) { 
            console.log(`[NetworkContext] Storage change detected for ${CONFIG_STORAGE_KEY}. Reloading config.`);
            loadAndSetConfig(); // Reload config if storage changes
          }
      };
      
      window.addEventListener('storage', handleStorageChange);
      
      // Cleanup listener
      return () => {
          window.removeEventListener('storage', handleStorageChange);
      };
  }, [loadAndSetConfig]); // Depend on the memoized loading function

  // Helper to get network by chain ID (Memoized)
  const getNetworkByChainId = useCallback((chainId: number): NetworkInfo | undefined => {
    return loadedConfiguredNetworks.find(network => network.chainId === chainId);
  }, [loadedConfiguredNetworks]);

  // Effect to synchronize context network with wallet network
  useEffect(() => {
    // Skip if not mounted or no wallet connection
    if (!isMounted) return;
    
    if (isConnected && walletChainId) {
      const supportedNetwork = getNetworkByChainId(walletChainId);
      if (supportedNetwork) {
        if (supportedNetwork.chainId !== currentNetwork?.chainId) {
          setCurrentNetwork(supportedNetwork);
        }
      } else {
        if (currentNetwork !== null) { 
          setCurrentNetwork(null);
        }
      }
    } else {
      if (!currentNetwork) {
        const defaultNetwork = loadedConfiguredNetworks.find(net => net.isDefault);
        if (defaultNetwork) {
          setCurrentNetwork(defaultNetwork);
        }
      }
    }
    // Dependency array: run when connection status or wallet chainId changes, or when network definitions change
  }, [isConnected, walletChainId, loadedConfiguredNetworks, getNetworkByChainId, currentNetwork, isMounted]);

  // Save current network to localStorage when it changes (for persistence when disconnected)
  useEffect(() => {
    // Skip on server side
    if (typeof window === 'undefined' || !isMounted) return;
    
    if (currentNetwork) {
      localStorage.setItem('quicktoken_last_network', JSON.stringify(currentNetwork));
    }
  }, [currentNetwork, isMounted]);

  // Helper to get network color based on chain ID
  const getNetworkColor = (chainId: number): string => {
    const network = getNetworkByChainId(chainId);
    
    if (!network) return 'text-gray-500';
    
    if (network.testnet) {
      return 'text-yellow-400';
    }
    
    // Different colors based on known networks
    switch (network.chainId) {
      case 1: // Ethereum
        return 'text-blue-500';
      case 56: // BSC
        return 'text-yellow-500';
      case 137: // Polygon
        return 'text-purple-500';
      case 10: // Optimism
        return 'text-red-500';
      case 42161: // Arbitrum
        return 'text-blue-400';
      default:
        return network.testnet ? 'text-yellow-400' : 'text-green-500';
    }
  };
  
  // Helper to get explorer URL with token support
  const getCustomExplorerUrl = (
    chainId: number, 
    address: string, 
    type: 'tx' | 'address' | 'token' = 'address'
  ): string => {
    // For token type, we need to handle it specially
    if (type === 'token') {
      const network = getNetworkByChainId(chainId);
      if (!network || !network.explorerUrl) {
        return '#';
      }
      const baseUrl = network.explorerUrl.endsWith('/') 
        ? network.explorerUrl.slice(0, -1) 
        : network.explorerUrl;
      return `${baseUrl}/token/${address}`;
    }
    
    // Otherwise, use the shared utility function
    return getExplorerUrl(chainId, address, type as 'address' | 'tx');
  };

  // Function to SET the network (user-initiated)
  const setNetwork = async (network: NetworkInfo): Promise<boolean> => {
    // Skip detailed implementation on server side
    if (typeof window === 'undefined' || !isMounted) return false;
    
    // Check if already on this network (based on context state)
    if (currentNetwork?.chainId === network.chainId) {
      return true; // Already on the desired network
    }

    setIsChangingNetwork(true);
    let success = false;

    try {
      // Check if wallet is connected and needs switching
      if (isConnected && walletChainId !== network.chainId) {
        // Call the centralized changeNetwork function from useWallet
        console.log('Requesting network switch to ' + network.name + '...');
        const switchSuccess = await walletChangeNetwork(network.chainId);

        if (!switchSuccess) {
          // If wallet switch failed (e.g., user rejection), stop here.
          // The error should be set within useWallet and displayed via its error state.
          console.warn('Wallet network switch failed or was rejected.');
          setIsChangingNetwork(false);
          return false;
        } else {
          // Wallet switch successful, proceed to update context state
          console.log('Wallet network switched successfully via useWallet.');
          setCurrentNetwork(network);
          console.log('Switched to ' + network.name);
          success = true;
        }
      } else {
        // Wallet not connected OR already on the correct chain, just update context state
        setCurrentNetwork(network);
        console.log('Set application network to ' + network.name);
        success = true;
      }
    } catch (error: any) {
      console.error('Error setting network context:', error);
      console.error('Failed to set network: ' + error.message);
    } finally {
      setIsChangingNetwork(false);
    }

    return success;
  };

  // Create memoized context value to avoid unnecessary re-renders
  const contextValue: NetworkContextType = useMemo(() => ({
    currentNetwork,
    setNetwork,
    isChangingNetwork,
    getNetworkByChainId,
    configuredNetworks: loadedConfiguredNetworks,
    getNetworkColor: (id) => getNetworkColor(id),
    getNetworkName: (id) => getNetworkName(id),
    getExplorerUrl: getCustomExplorerUrl,
    isConfigLoading,
  }), [
    currentNetwork,
    isChangingNetwork,
    loadedConfiguredNetworks,
    getNetworkByChainId,
    setNetwork,
    getNetworkColor,
    getNetworkName,
    getCustomExplorerUrl,
    isConfigLoading,
  ]);

  return (
    <NetworkContext.Provider value={contextValue}>
      {children}
    </NetworkContext.Provider>
  );
};

export default NetworkContext; 