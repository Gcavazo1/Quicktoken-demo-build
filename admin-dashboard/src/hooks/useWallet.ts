import { useCallback, useState, useEffect } from 'react';
import { useAccount, useDisconnect, useSwitchChain, useConfig } from 'wagmi';
import { useClientWeb3Modal } from './useClientWeb3Modal';
import { NETWORKS, NetworkInfo } from '../shared/constants/networks';
import { truncateAddress } from '../utils/format';
import { getPublicClient, getWalletClient, disconnect } from 'wagmi/actions';
import { formatEther } from 'ethers';

// Define the shape of the context value provided by the hook
interface WalletContextValue {
  provider: any | null; // Keeping as any for backward compatibility
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  isInitializing: boolean;
  isNetworkSwitching: boolean;
  error: string | null;
  walletInfo: any | null; // Keeping as any for backward compatibility
  connectWallet: () => Promise<boolean>;
  disconnectWallet: () => void;
  getNetwork: () => NetworkInfo | null;
  formatAddress: () => string;
  getBalance: () => Promise<string>;
  isNetworkSupported: () => boolean;
  changeNetwork: (newChainId: number) => Promise<boolean>;
}

// Default values for SSR
const defaultWalletValue: WalletContextValue = {
  provider: null,
  address: null,
  chainId: null,
  isConnected: false,
  isConnecting: false,
  isInitializing: false,
  isNetworkSwitching: false,
  error: null,
  walletInfo: null,
  connectWallet: async () => false,
  disconnectWallet: () => {},
  getNetwork: () => null,
  formatAddress: () => '',
  getBalance: async () => '0',
  isNetworkSupported: () => false,
  changeNetwork: async () => false,
};

/**
 * Hook for managing wallet connection state using Wagmi
 */
export const useWallet = (): WalletContextValue => {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';
  
  // State to track if component is mounted (client-side)
  const [isMounted, setIsMounted] = useState(false);
  
  // Set mounted state after component mounts on client
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Return default values during SSR or before hydration
  if (!isBrowser || !isMounted) {
    return defaultWalletValue;
  }
  
  // All the Wagmi hooks - only used on client-side after the check above
  const { address, isConnected, chainId, status } = useAccount();
  const { open } = useClientWeb3Modal();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isNetworkSwitching, error: switchError } = useSwitchChain();
  const [error, setError] = useState<string | null>(null);
  const config = useConfig();

  // Map isInitializing and isConnecting from Wagmi status
  const isInitializing = status === 'reconnecting';
  const isConnecting = status === 'connecting';

  // Connect wallet function - Opens Web3Modal
  const connectWallet = useCallback(async (): Promise<boolean> => {
    try {
      open();
      return true;
    } catch (err: any) {
      console.error('[useWallet] Error during wallet connection:', err);
      setError(err?.message || 'Failed to connect wallet');
      return false;
    }
  }, [open]);

  // Disconnect wallet function
  const disconnectWallet = useCallback(() => {
    try {
      disconnect();
      setError(null);
    } catch (err: any) {
      console.error('[useWallet] Error during wallet disconnection:', err);
      setError(err?.message || 'Failed to disconnect wallet');
    }
  }, [disconnect]);

  // Get current network
  const getNetwork = useCallback(() => {
    if (!chainId) return null;
    // Convert NETWORKS to array for find operation
    const networksList = Object.values(NETWORKS);
    return networksList.find((network: NetworkInfo) => network.chainId === chainId) || null;
  }, [chainId]);

  // Check if current network is supported
  const isNetworkSupported = useCallback(() => {
    if (!chainId) return false;
    // Convert NETWORKS to array for some operation
    const networksList = Object.values(NETWORKS);
    return networksList.some((network: NetworkInfo) => network.chainId === chainId);
  }, [chainId]);

  // Format address for display
  const formatAddress = useCallback(() => {
    if (!address) return '';
    return truncateAddress(address);
  }, [address]);

  // Get wallet balance
  const getBalance = useCallback(async (): Promise<string> => {
    if (!address || !chainId) return '0';
    
    try {
      // Use wagmi/actions instead of hook inside callback
      const publicClient = getPublicClient(config);
      if (!publicClient) return '0';
      
      const balance = await publicClient.getBalance({
        address: address as `0x${string}`,
      });
      
      return formatEther(balance);
    } catch (err) {
      console.error('[useWallet] Error getting balance:', err);
      return '0';
    }
  }, [address, chainId, config]);

  // Change network
  const changeNetwork = useCallback(async (newChainId: number): Promise<boolean> => {
    if (!isConnected) return false;
    
    try {
      await switchChain({ chainId: newChainId });
      return true;
    } catch (err: any) {
      console.error('[useWallet] Error during network switch:', err);
      setError(err?.message || 'Failed to switch network');
      return false;
    }
  }, [isConnected, switchChain]);

  // Get provider (for backward compatibility)
  const getProvider = async () => {
    try {
      const walletClient = await getWalletClient(config);
      return walletClient;
    } catch (error) {
      console.error('[useWallet] Error getting provider:', error);
      return null;
    }
  };

  return {
    provider: null, // Will be populated when required
    address: address || null,
    chainId: chainId || null,
    isConnected,
    isConnecting,
    isInitializing,
    isNetworkSwitching,
    error: switchError?.message || error,
    walletInfo: null, // No direct equivalent in Wagmi
    connectWallet,
    disconnectWallet,
    getNetwork,
    formatAddress,
    getBalance,
    isNetworkSupported,
    changeNetwork,
  };
}; 