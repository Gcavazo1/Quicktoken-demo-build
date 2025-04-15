import { useCallback, useEffect, useState, useRef } from 'react';
import { ethers } from 'ethers';
import { WalletConnector } from '../services/WalletConnector';
import { NETWORKS, NetworkInfo } from '../shared/constants/networks';
import { Provider } from '../lib/types/web3';
import { truncateAddress } from '../utils/format';
import { EIP6963ProviderInfo, EIP1193Provider } from '../services/WalletConnector';

// localStorage key for persistence
const LAST_WALLET_RDNS_KEY = 'quicktoken_last_wallet_rdns';

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
  getNetwork: () => NetworkInfo | null;
  formatAddress: () => string;
  getBalance: () => Promise<string>;
  isNetworkSupported: () => boolean;
  changeNetwork: (newChainId: number) => Promise<boolean>;
}

/**
 * Hook for managing wallet connection state using EIP-6963
 */
export const useWallet = (): WalletContextValue => {
  // Get the singleton instance of the WalletConnector
  const connector = WalletConnector.getInstance();

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
  
  // Use a flag to prevent multiple auto-reconnect attempts
  const attemptedAutoReconnectRef = useRef<boolean>(false);
  
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
      // This handler is primarily for internal state cleanup triggered by WalletConnector
      // console.log('[useWallet] Received walletDisconnected event.');
      if (isMountedRef.current) { // Check if mounted
         setProvider(null);
         setAddress(null);
         setChainId(null);
         setWalletInfo(null);
         setIsConnected(false);
         setError(null);
         // Clear persisted RDNS on disconnect event
         localStorage.removeItem(LAST_WALLET_RDNS_KEY);
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
      const isSwitching = connector.isNetworkSwitching();
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
      } = await connector.getConnectionState();
      
      const currentRdns = connectedWalletInfo?.rdns || null;

      if (isMountedRef.current) {
        if (connectedProvider && connectedAccount) {
          // Update state only if it has changed
          if (provider !== connectedProvider) setProvider(connectedProvider);
          if (address !== connectedAccount) setAddress(connectedAccount);
          if (chainId !== connectedChainId) setChainId(connectedChainId);
          if (walletInfo?.rdns !== currentRdns) setWalletInfo(connectedWalletInfo || null);
          if (!isConnected) setIsConnected(true);
          if (error) setError(null); // Clear previous error on successful check
        } else {
          // If connector returns no connection, ensure local state is cleared
          if (provider !== null) setProvider(null);
          if (address !== null) setAddress(null);
          if (chainId !== null) setChainId(null);
          if (walletInfo !== null) setWalletInfo(null);
          if (isConnected) setIsConnected(false);
          
          // --- Auto-reconnect logic ---
          // If disconnected and haven't attempted auto-reconnect yet in this session
          if (!attemptedAutoReconnectRef.current) {
              attemptedAutoReconnectRef.current = true; // Mark as attempted
              const savedRdns = localStorage.getItem(LAST_WALLET_RDNS_KEY);
              if (savedRdns) {
                  console.log(`${logPrefix} No active connection found, attempting to auto-reconnect to ${savedRdns}...`);
                  // Use connectWallet internally to attempt reconnection
                  // Set isConnecting during this attempt
                  setIsConnecting(true); 
                  try {
                      await connectWallet(savedRdns);
                  } finally {
                       // Ensure isConnecting is reset even if connectWallet fails internally
                      if (isMountedRef.current) {
                           setIsConnecting(false);
                      }                  
                  }
              }
          }
          // --- End auto-reconnect logic ---
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
  const getNetwork = useCallback((): NetworkInfo | null => {
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
   * Connect to a specific wallet provider using its RDNS identifier.
   */
  const connectWallet = useCallback(async (rdns: string): Promise<boolean> => {
    // console.log(`[useWallet] Connecting to wallet with RDNS: ${rdns}`);
    let success = false;
    if (isMountedRef.current) {
      setIsConnecting(true);
      setError(null); // Clear previous error
    }

    try {
      // Use the connector instance to connect
      const result = await connector.connect(rdns); // Use connector instance
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Update state based on connection result (handled by checkConnection now)
      // if (isMountedRef.current) {
      //   setProvider(result.provider);
      //   setAddress(result.account);
      //   setChainId(result.chainId);
      //   setWalletInfo(result.walletInfo || null);
      //   setIsConnected(true);
          // Save RDNS on successful connect
          localStorage.setItem(LAST_WALLET_RDNS_KEY, rdns);
          success = true;
      // }
      
    } catch (error: any) {
       console.error(`[useWallet] Error connecting to ${rdns}:`, error);
       if (isMountedRef.current) {
         setError(error.message || 'Failed to connect wallet');
         // Ensure state is cleared on failed connection attempt
         setProvider(null);
         setAddress(null);
         setChainId(null);
         setWalletInfo(null);
         setIsConnected(false);
         localStorage.removeItem(LAST_WALLET_RDNS_KEY); // Clear potentially stale key
       }
    } finally {
      if (isMountedRef.current) {
         setIsConnecting(false);
         // Trigger a state check immediately after attempting connection
         await checkConnection(); 
      }
    }
    return success;
  }, [connector]); // Removed state vars, rely on checkConnection

  /**
   * Disconnect the currently connected wallet.
   */
  const disconnectWallet = useCallback(async () => {
    // console.log('[useWallet] Disconnecting wallet...');
    try {
      await connector.disconnect(); // Use connector instance
      // State updates are handled by the walletDisconnected event listener
      // and the subsequent checkConnection call, but we still clear localStorage here.
      localStorage.removeItem(LAST_WALLET_RDNS_KEY);
      // Manually trigger checkConnection to ensure UI updates immediately after disconnect call
      await checkConnection(); 
    } catch (error: any) {
       console.error('[useWallet] Error disconnecting wallet:', error);
       if (isMountedRef.current) {
          setError(error.message || 'Failed to disconnect wallet');
       }
    }
  }, [connector]); // Removed state vars
  
  /**
   * Switch to a different network using the active EIP-1193 provider
   */
  const changeNetwork = useCallback(async (newChainId: number): Promise<boolean> => { 
    const logPrefix = '[useWallet.changeNetwork]';

    // Get the active provider detail from the connector instance
    const activeProviderDetail = connector.getActiveProviderDetail(); // Use connector instance
    if (!activeProviderDetail) {
      console.error(`${logPrefix} No active wallet provider found.`);
      if (isMountedRef.current) setError('Cannot switch network: No active wallet connection.');
      return false;
    }

    // Get the raw EIP-1193 provider instance
    const activeEip1193Provider = activeProviderDetail.provider as EIP1193Provider;
    if (!activeEip1193Provider || typeof activeEip1193Provider.request !== 'function') {
      console.error(`${logPrefix} Active provider detail does not contain a valid EIP-1193 request method.`);
      if (isMountedRef.current) setError('Cannot switch network: Invalid provider instance.');
      return false;
    }

    if (isMountedRef.current) {
      setIsNetworkSwitching(true);
      setError(null); // Clear previous errors
    }
    
    try {
      const network = NETWORKS[newChainId];
      if (!network) {
        throw new Error(`Network configuration not found for chain ID ${newChainId}`);
      }
      
      const hexChainId = `0x${newChainId.toString(16)}`;

      try {
        // Try to switch to the network using the active provider
        // console.log(`${logPrefix} Attempting wallet_switchEthereumChain to ${hexChainId} via ${activeProviderDetail.info.name}`);
        await activeEip1193Provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: hexChainId }],
        });
        // console.log(`${logPrefix} Network switch successful.`);
        // No need to manually update chainId state here, the 'chainChanged' event
        // handled by WalletConnector should trigger a state update via checkConnection.
        return true;
      } catch (switchError: any) {
        console.warn(`${logPrefix} wallet_switchEthereumChain failed:`, switchError);
        // Error code 4902 indicates the chain has not been added to the wallet
        if (switchError.code === 4902) {
          console.log(`${logPrefix} Chain ${hexChainId} not found in wallet. Attempting wallet_addEthereumChain...`);
          // Prepare parameters for adding the network
          const currencySymbol = typeof network.currency === 'string' 
            ? network.currency 
            : network.currency.symbol;
          
          const addParams = {
            chainId: hexChainId,
            chainName: network.name,
            nativeCurrency: {
              name: typeof network.currency === 'string' ? network.currency : network.currency.name,
              symbol: currencySymbol,
              decimals: typeof network.currency === 'string' ? 18 : network.currency.decimals,
            },
            rpcUrls: [network.rpcUrl].filter(Boolean), // Ensure RPC URL exists
            blockExplorerUrls: network.blockExplorerUrl ? [network.blockExplorerUrl] : undefined,
          };

          // Attempt to add the network using the active provider
          await activeEip1193Provider.request({
            method: 'wallet_addEthereumChain',
            params: [addParams],
          });
          console.log(`${logPrefix} wallet_addEthereumChain successful.`);
          return true;
        } else if (switchError.code === -32000 || switchError.code === 4001) {
          // Handle user rejection specifically
          console.log(`${logPrefix} User rejected network switch request.`);
          throw new Error('User rejected network switch request.');
        }
        throw switchError; // Re-throw other errors
      }
    } catch (error: any) {
      console.error(`${logPrefix} Failed to switch network:`, error);
      if (isMountedRef.current) {
        // Set specific error message for user rejection, otherwise generic
        let message = `Failed to switch network: ${error.message || 'Unknown error'}`;
        if (error.message?.includes('User rejected')) {
            message = 'Network switch request rejected.';
        } else {
            // Enhance the message for other failures
            message = `Could not switch network via dashboard (${error.message || 'Unknown error'}). Please try switching directly in your wallet extension.`;
        }
        setError(message);
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
  }, [connector, setError]); // Add connector to dependency array
  
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
    changeNetwork,
  };
};

export default useWallet; 