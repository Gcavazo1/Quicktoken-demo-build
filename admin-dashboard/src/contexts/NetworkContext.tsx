import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NETWORKS, NetworkInfo, getNetworkName, getExplorerUrl, getNetworkBadgeClass } from '../shared/constants/networks';
import { useNotification } from './NotificationContext';
import { useWallet } from '../hooks/useWallet';

// Define context type
interface NetworkContextType {
  currentNetwork: NetworkInfo | null;
  setNetwork: (network: NetworkInfo) => Promise<boolean>;
  isChangingNetwork: boolean;
  getNetworkByChainId: (chainId: number) => NetworkInfo | undefined;
  supportedNetworks: NetworkInfo[];
  addCustomNetwork: (network: NetworkInfo) => void;
  removeCustomNetwork: (chainId: number) => void;
  updateNetwork: (network: NetworkInfo) => void;
  getNetworkColor: (chainId: number) => string;
  getNetworkName: (chainId: number) => string;
  getExplorerUrl: (chainId: number, address: string, type?: 'tx' | 'address' | 'token') => string;
  getConfiguredNetworks: () => NetworkInfo[];
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
  supportedNetworks: convertToExpandedNetworks(),
  addCustomNetwork: () => {},
  removeCustomNetwork: () => {},
  updateNetwork: () => {},
  getNetworkColor: () => 'text-gray-500',
  getNetworkName: () => 'Unknown Network',
  getExplorerUrl: () => '#',
  getConfiguredNetworks: () => []
});

// Custom hook to use the network context
export const useNetwork = () => useContext(NetworkContext);

interface NetworkProviderProps {
  children: ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
  const [currentNetwork, setCurrentNetwork] = useState<NetworkInfo | null>(null);
  const [customNetworks, setCustomNetworks] = useState<NetworkInfo[]>([]);
  const [isChangingNetwork, setIsChangingNetwork] = useState(false);
  const { showNotification } = useNotification();
  const { provider } = useWallet();
  
  // Default networks converted to our format
  const defaultNetworks = convertToExpandedNetworks();

  // Load custom networks from localStorage on mount
  useEffect(() => {
    try {
      const storedCustomNetworks = localStorage.getItem('quicktoken_custom_networks');
      if (storedCustomNetworks) {
        setCustomNetworks(JSON.parse(storedCustomNetworks));
      }
      
      // Try to set last used network from localStorage
      const lastUsedNetwork = localStorage.getItem('quicktoken_last_network');
      if (lastUsedNetwork) {
        const networkData = JSON.parse(lastUsedNetwork);
        const network = [...defaultNetworks, ...customNetworks].find(n => n.chainId === networkData.chainId);
        if (network) {
          setCurrentNetwork(network);
        }
      } else {
        // Default to Ethereum Mainnet or first available network
        setCurrentNetwork(defaultNetworks[0]);
      }
    } catch (error) {
      console.error('Error loading network data from localStorage:', error);
    }
  }, []);

  // Save custom networks to localStorage when they change
  useEffect(() => {
    if (customNetworks.length > 0) {
      localStorage.setItem('quicktoken_custom_networks', JSON.stringify(customNetworks));
    }
  }, [customNetworks]);

  // Save current network to localStorage when it changes
  useEffect(() => {
    if (currentNetwork) {
      localStorage.setItem('quicktoken_last_network', JSON.stringify(currentNetwork));
    }
  }, [currentNetwork]);

  // All supported networks (predefined + custom)
  const supportedNetworks = [...defaultNetworks, ...customNetworks];

  // Helper to get network by chain ID
  const getNetworkByChainId = (chainId: number): NetworkInfo | undefined => {
    return supportedNetworks.find(network => network.chainId === chainId);
  };

  // Add custom network
  const addCustomNetwork = (network: NetworkInfo) => {
    // Check if network with same chainId already exists
    if (!supportedNetworks.some(n => n.chainId === network.chainId)) {
      setCustomNetworks(prev => [...prev, network]);
      showNotification(`Added network: ${network.name}`, 'success');
    } else {
      showNotification(`Network with chain ID ${network.chainId} already exists`, 'error');
    }
  };

  // Remove custom network
  const removeCustomNetwork = (chainId: number) => {
    // Check if it's a default network
    if (defaultNetworks.some(n => n.chainId === chainId)) {
      showNotification('Cannot remove default network', 'error');
      return;
    }
    
    const networkToRemove = getNetworkByChainId(chainId);
    if (networkToRemove) {
      setCustomNetworks(prev => prev.filter(n => n.chainId !== chainId));
      showNotification(`Removed network: ${networkToRemove.name}`, 'success');
      
      // If current network is being removed, switch to default
      if (currentNetwork?.chainId === chainId) {
        setCurrentNetwork(defaultNetworks[0]);
      }
    }
  };

  // Function to switch networks
  const setNetwork = async (network: NetworkInfo): Promise<boolean> => {
    try {
      setIsChangingNetwork(true);
      
      // If connected to wallet, try to switch network in wallet too
      if (provider) {
        // Access the window.ethereum object directly for wallet operations
        const ethereum = window.ethereum as any;
        if (ethereum && typeof ethereum.request === 'function') {
          try {
            // Try to switch to the network
            await ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${network.chainId.toString(16)}` }],
            });
          } catch (switchError: any) {
            // This error code indicates the chain has not been added to MetaMask
            if (switchError.code === 4902 || switchError.message?.includes('wallet_addEthereumChain')) {
              try {
                await ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [
                    {
                      chainId: `0x${network.chainId.toString(16)}`,
                      chainName: network.name,
                      nativeCurrency: {
                        name: typeof network.currency === 'string' ? network.currency : network.currency.name,
                        symbol: typeof network.currency === 'string' ? network.currency : network.currency.symbol,
                        decimals: typeof network.currency === 'string' ? 18 : network.currency.decimals,
                      },
                      rpcUrls: [network.rpcUrl],
                      blockExplorerUrls: [network.explorerUrl],
                    },
                  ],
                });
              } catch (addError: any) {
                console.error('Error adding network to wallet:', addError);
                showNotification(`Failed to add network: ${addError.message}`, 'error');
                return false;
              }
            } else {
              console.error('Error switching network in wallet:', switchError);
              showNotification(`Failed to switch network: ${switchError.message}`, 'error');
              // Continue anyway to update the UI
            }
          }
        }
      }

      // Update the current network in our state
      setCurrentNetwork(network);
      showNotification(`Switched to ${network.name}`, 'info');
      return true;
    } catch (error: any) {
      console.error('Error switching network:', error);
      showNotification(`Network switch failed: ${error.message}`, 'error');
      return false;
    } finally {
      setIsChangingNetwork(false);
    }
  };

  // Set initial network from localStorage or first default
  useEffect(() => {
    const initializeNetwork = async () => {
      // Try to get network from localStorage
      const savedNetworkJson = localStorage.getItem('currentNetwork');
      let initialNetwork: NetworkInfo | null = null;
      
      if (savedNetworkJson) {
        try {
          const savedNetwork = JSON.parse(savedNetworkJson);
          if (savedNetwork && typeof savedNetwork.chainId === 'number') {
            const network = getNetworkByChainId(savedNetwork.chainId);
            if (network) {
              initialNetwork = network;
            }
          }
        } catch (error) {
          console.error('Error parsing saved network:', error);
        }
      }
      
      // If no valid saved network, use the first default
      if (!initialNetwork) {
        initialNetwork = defaultNetworks[0];
      }
      
      // Set the network
      if (initialNetwork) {
        setCurrentNetwork(initialNetwork);
        
        // Try to also set the wallet network if provider exists
        const ethereum = window.ethereum as any;
        if (provider && ethereum) {
          try {
            await setNetwork(initialNetwork);
          } catch (error) {
            console.error('Failed to set initial network:', error);
          }
        }
      }
    };
    
    initializeNetwork();
  }, [provider]); // Re-run when provider changes

  // Save current network to localStorage when it changes
  useEffect(() => {
    if (currentNetwork) {
      localStorage.setItem('currentNetwork', JSON.stringify({
        chainId: currentNetwork.chainId,
      }));
    }
  }, [currentNetwork]);

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

  // Helper function to get configured networks from setup
  const getConfiguredNetworks = (): NetworkInfo[] => {
    try {
      const configString = localStorage.getItem('quicktoken_config');
      if (configString) {
        const config = JSON.parse(configString);
        
        // Get the list of enabled network chain IDs from config
        const enabledChainIds = config.networks.configuredNetworks
          .filter((network: any) => network.isEnabled)
          .map((network: any) => parseInt(network.chainId));
        
        // Filter supportedNetworks to only include enabled networks
        return supportedNetworks.filter(network => 
          enabledChainIds.includes(network.chainId)
        );
      }
      
      // If no config found, just use all supported networks
      return supportedNetworks;
    } catch (error) {
      console.error('Error loading network configuration:', error);
      // Fallback to all networks
      return supportedNetworks;
    }
  };

  // Add updateNetwork function in the NetworkProvider component
  const updateNetwork = (network: NetworkInfo) => {
    // Find if network already exists
    const existingNetworkIndex = customNetworks.findIndex(n => n.chainId === network.chainId);
    
    // If it's a default network, we can't update it
    if (defaultNetworks.some(n => n.chainId === network.chainId)) {
      showNotification(`Cannot modify default network: ${network.name}`, 'error');
      return;
    }
    
    // If network doesn't exist in customNetworks
    if (existingNetworkIndex === -1) {
      showNotification(`Network with chain ID ${network.chainId} not found`, 'error');
      return;
    }
    
    // Update the network
    const updatedNetworks = [...customNetworks];
    updatedNetworks[existingNetworkIndex] = network;
    setCustomNetworks(updatedNetworks);
    
    // If current network is being updated, update that too
    if (currentNetwork?.chainId === network.chainId) {
      setCurrentNetwork(network);
    }
    
    showNotification(`Updated network: ${network.name}`, 'success');
  };

  const contextValue: NetworkContextType = {
    currentNetwork,
    setNetwork,
    isChangingNetwork,
    getNetworkByChainId,
    supportedNetworks,
    addCustomNetwork,
    removeCustomNetwork,
    updateNetwork,
    getNetworkColor,
    getNetworkName,
    getExplorerUrl: getCustomExplorerUrl,
    getConfiguredNetworks
  };

  return (
    <NetworkContext.Provider value={contextValue}>
      {children}
    </NetworkContext.Provider>
  );
};

export default NetworkContext; 