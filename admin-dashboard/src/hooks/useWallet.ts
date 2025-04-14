import { useCallback, useEffect, useState, useRef } from 'react';
import { ethers } from 'ethers';
import WalletConnector from '../services/WalletConnector';
import { NETWORKS, Network } from '../shared/constants/networks';
import { Provider } from '../lib/types/web3';
import { truncateAddress } from '../utils/format';
import { EIP6963ProviderInfo } from '../services/WalletConnector';

// Add type definition for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

// Define the shape of the context value provided by the hook
interface WalletContextValue {
  provider: ethers.BrowserProvider | null;
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  isNetworkSwitching: boolean;
  error: string | null;
  walletInfo: EIP6963ProviderInfo | null;
  connectWallet: (rdns: string) => Promise<boolean>;
  disconnectWallet: () => void;
  getNetwork: () => Network | null;
  formatAddress: () => string;
  getBalance: () => Promise<string>;
  isNetworkSupported: () => boolean;
}

/**
 * Hook for managing wallet connection state using EIP-6963
 */
export const useWallet = (): WalletContextValue => {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isNetworkSwitching, setIsNetworkSwitching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [walletInfo, setWalletInfo] = useState<EIP6963ProviderInfo | null>(null);
  
  // Use a ref to track the check interval
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Use a ref to track if component is mounted
  const isMountedRef = useRef<boolean>(true);
  
  // Check connection state on initial render
  useEffect(() => {
    // Set mounted flag
    isMountedRef.current = true;
    
    // Check connection immediately
    checkConnection();
    
    // Set up periodic checking for wallet state changes - less frequent to avoid hammering
    // and to prevent errors during network changes
    checkIntervalRef.current = setInterval(checkConnection, 5000);
    
    // Set up listeners for events dispatched by WalletConnector
    const handleWalletDisconnect = () => {
      if (isMountedRef.current) {
        console.log('[useWallet] Received walletDisconnected event.');
        setProvider(null);
        setAddress(null);
        setChainId(null);
        setWalletInfo(null);
        setIsConnected(false);
        setError(null);
      }
    };
    // Maybe add listeners for account/chain changes pushed from WalletConnector?

    window.addEventListener('walletDisconnected', handleWalletDisconnect);

    return () => {
      // Set unmounted flag
      isMountedRef.current = false;
      
      // Clean up interval
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      window.removeEventListener('walletDisconnected', handleWalletDisconnect);
    };
  }, []);
  
  // Check wallet connection state by polling WalletConnector
  const checkConnection = async () => {
    if (!isMountedRef.current) return;
    const logPrefix = "[useWallet.checkConnection]";

    try {
      // Check internal network switching state first
      const isSwitching = WalletConnector.isNetworkSwitching();
      if (isSwitching) {
        // If connector says it's switching, reflect that in local state
        if (!isNetworkSwitching) setIsNetworkSwitching(true);
        // Reset after a delay
        setTimeout(() => {
            if (isMountedRef.current) setIsNetworkSwitching(false);
        }, 1500); // Increased delay slightly
        return; // Don't check state while switching
      }
      // If connector is not switching, ensure local state reflects that
      if (isNetworkSwitching) setIsNetworkSwitching(false);

      const { 
        provider: connectedProvider, 
        account: connectedAccount, 
        chainId: connectedChainId, 
        walletInfo: connectedWalletInfo
      } = await WalletConnector.getConnectionState();
      
      const currentRdns = connectedWalletInfo?.rdns || null;

      if (isMountedRef.current) {
        if (connectedProvider && connectedAccount) {
          // Update state only if it has changed
          if (provider !== connectedProvider) setProvider(connectedProvider);
          if (address !== connectedAccount) setAddress(connectedAccount);
          if (chainId !== connectedChainId) setChainId(connectedChainId);
          if (walletInfo?.rdns !== currentRdns) setWalletInfo(connectedWalletInfo);
          if (!isConnected) setIsConnected(true);
          if (error) setError(null); // Clear previous error on successful check
        } else {
          // If connector returns no connection, ensure local state is cleared
          if (provider !== null) setProvider(null);
          if (address !== null) setAddress(null);
          if (chainId !== null) setChainId(null);
          if (walletInfo !== null) setWalletInfo(null);
          if (isConnected) setIsConnected(false);
        }
      }
    } catch (error: any) {
      console.error(`${logPrefix} Error checking connection state:`, error);
      if (isMountedRef.current) {
         setError(error.message || 'Failed to check wallet connection');
         // Clear state on error to be safe
         setProvider(null);
         setAddress(null);
         setChainId(null);
         setWalletInfo(null);
         setIsConnected(false);
      }
    }
  };
  
  /**
   * Get the current network information
   */
  const getNetwork = useCallback((): Network | null => {
    if (!chainId) return null;
    
    const network = NETWORKS[chainId];
    if (network) {
      // If the currency is a string, convert it to the expected object format
      if (typeof network.currency === 'string') {
        return {
          ...network,
          currency: {
            name: network.currency,
            symbol: network.currency,
            decimals: 18
          }
        };
      }
      return network;
    }
    
    // Fallback for unknown networks
    return { 
      chainId,
      name: `Chain ID ${chainId}`,
      shortName: `Chain ${chainId}`,
      isTestnet: false,
      testnet: false,
      currency: {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18
      },
      rpcUrl: '',
      blockExplorerUrl: '',
      explorerUrl: ''
    };
  }, [chainId]);
  
  /**
   * Format wallet address for display
   */
  const formatAddress = useCallback(() => {
    if (!address) return '';
    return truncateAddress(address);
  }, [address]);
  
  /**
   * Get wallet balance
   */
  const getBalance = useCallback(async (): Promise<string> => {
    if (!provider || !address) return '0';
    
    try {
      const balance = await provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get wallet balance:', error);
      return '0';
    }
  }, [provider, address]);
  
  /**
   * Check if the connected wallet has the correct network for the current environment
   */
  const isNetworkSupported = useCallback((): boolean => {
    if (!chainId) return false;
    return Boolean(NETWORKS[chainId]);
  }, [chainId]);
  
  /**
   * Connect to a wallet using its RDNS identifier
   */
  const connectWallet = async (rdns: string): Promise<boolean> => {
    if (isMountedRef.current) {
      setIsConnecting(true);
      setError(null);
    }
    
    let success = false;
    try {
      console.log(`[useWallet] Attempting to connect to wallet RDNS: ${rdns}`);
      const { 
        provider: connectedProvider, 
        account: connectedAccount, 
        chainId: connectedChainId, 
        error: connectError, 
        walletInfo: connectedWalletInfo
      } = await WalletConnector.connect(rdns);
      
      if (!isMountedRef.current) return false;
      
      if (connectError) {
        console.error(`[useWallet] Error connecting to ${connectedWalletInfo?.name || rdns}:`, connectError);
        setError(connectError);
        setProvider(null);
        setAddress(null);
        setChainId(null);
        setWalletInfo(null);
        setIsConnected(false);
        success = false;
      } else if (connectedProvider && connectedAccount) {
        console.log(`[useWallet] Successfully connected to ${connectedWalletInfo?.name} with address: ${connectedAccount}`);
        setProvider(connectedProvider);
        setAddress(connectedAccount);
        setChainId(connectedChainId);
        setWalletInfo(connectedWalletInfo || null);
        setIsConnected(true);
        setError(null);
        success = true;
      } else {
        console.warn(`[useWallet] Connection attempt for ${rdns} finished without error but lacked provider/account.`);
        setError('Connection failed: No provider or account returned.');
        setProvider(null);
        setAddress(null);
        setChainId(null);
        setWalletInfo(null);
        setIsConnected(false);
        success = false;
      }
    } catch (error: any) {
      console.error('[useWallet] Wallet connection error:', error);
      if (isMountedRef.current) {
        setError(error.message || 'Failed to connect wallet');
        setProvider(null);
        setAddress(null);
        setChainId(null);
        setWalletInfo(null);
        setIsConnected(false);
      }
      success = false;
    } finally {
      if (isMountedRef.current) {
        setIsConnecting(false);
      }
    }
    return success;
  };
  
  /**
   * Disconnect the current wallet
   */
  const disconnectWallet = useCallback((): void => {
    console.log('[useWallet] Disconnecting wallet...');
    WalletConnector.disconnect();
  }, []);
  
  /**
   * Switch to a different network
   */
  const changeNetwork = useCallback(async (newChainId: number): Promise<boolean> => {
    if (!window.ethereum) return false;
    
    if (isMountedRef.current) {
      setIsNetworkSwitching(true);
    }
    
    try {
      // Get network information
      const network = NETWORKS[newChainId];
      if (!network) {
        throw new Error(`Network configuration not found for chain ID ${newChainId}`);
      }
      
      try {
        // Try to switch to the network
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${newChainId.toString(16)}` }],
        });
        
        return true;
      } catch (switchError: any) {
        // This error code indicates that the chain has not been added to the wallet
        if (switchError.code === 4902) {
          // Add the network
          const currencySymbol = typeof network.currency === 'string' 
            ? network.currency 
            : network.currency.symbol;
            
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${newChainId.toString(16)}`,
                chainName: network.name,
                nativeCurrency: {
                  name: typeof network.currency === 'string' ? network.currency : network.currency.name,
                  symbol: currencySymbol,
                  decimals: typeof network.currency === 'string' ? 18 : network.currency.decimals,
                },
                rpcUrls: [network.rpcUrl],
                blockExplorerUrls: network.blockExplorerUrl ? [network.blockExplorerUrl] : undefined,
              },
            ],
          });
          return true;
        }
        throw switchError;
      }
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      
      if (isMountedRef.current) {
        setError(`Failed to switch network: ${error.message}`);
      }
      
      return false;
    } finally {
      // Reset network switching after a delay to allow for UI updates
      setTimeout(() => {
        if (isMountedRef.current) {
          setIsNetworkSwitching(false);
        }
      }, 1000);
    }
  }, []);
  
  return {
    provider,
    address,
    chainId,
    isConnected,
    isConnecting,
    isNetworkSwitching,
    error,
    walletInfo,
    connectWallet,
    disconnectWallet,
    getNetwork,
    formatAddress,
    getBalance,
    isNetworkSupported,
  };
};

export default useWallet; 