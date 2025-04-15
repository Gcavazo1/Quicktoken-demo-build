import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { DeployedToken, TokenDeployParams, TokenAction } from '../lib/types/tokens';
import { QuickTokenABI } from '../lib/QuickTokenABI';
import { deployToken, loadDeployedTokens, saveDeployedToken, saveMultipleTokens } from '../lib/deployToken';
import { Provider } from '../lib/types/web3';
import { useNetwork } from './NetworkContext';
import { useWallet } from '../hooks/useWallet';

/**
 * Token context value interface
 */
interface TokenContextValue {
  tokens: DeployedToken[];
  ownedTokens: DeployedToken[];
  networkTokens: DeployedToken[];
  ownedNetworkTokens: DeployedToken[];
  allNetworksTokens: Record<number, DeployedToken[]>;
  isLoading: boolean;
  error: string | null;
  selectedToken: DeployedToken | null;
  deployToken: (params: TokenDeployParams) => Promise<string | null>;
  performTokenAction: (params: {
    token: DeployedToken;
    action: TokenAction;
    amount?: string;
    recipient?: string;
  }) => Promise<boolean>;
  refreshTokenInfo: (tokenAddress: string) => Promise<void>;
  refreshNetworkTokens: () => Promise<void>;
  refreshAllTokens: () => Promise<void>;
  selectToken: (tokenAddress: string | null) => void;
  getOwnedTokens: (specificChainId?: number) => DeployedToken[];
  getNetworkTokens: (specificChainId?: number) => DeployedToken[];
  getOwnedNetworkTokens: (specificChainId?: number) => DeployedToken[];
  findToken: (address: string, specificChainId?: number) => DeployedToken | undefined;
  importToken: (address: string) => Promise<boolean>;
}

// Default context value
const defaultTokenContext: TokenContextValue = {
  tokens: [],
  ownedTokens: [],
  networkTokens: [],
  ownedNetworkTokens: [],
  allNetworksTokens: {},
  isLoading: false,
  error: null,
  selectedToken: null,
  deployToken: async () => null,
  performTokenAction: async () => false,
  refreshTokenInfo: async () => {},
  refreshNetworkTokens: async () => {},
  refreshAllTokens: async () => {},
  selectToken: () => {},
  getOwnedTokens: () => [],
  getNetworkTokens: () => [],
  getOwnedNetworkTokens: () => [],
  findToken: () => undefined,
  importToken: async () => false
};

// Create the context
const TokenContext = createContext<TokenContextValue>(defaultTokenContext);

// Hook to use the TokenContext
export const useTokens = () => useContext(TokenContext);

// Provider component props
interface TokenProviderProps {
  children: ReactNode;
}

/**
 * Token Provider Component
 * Manages token state and actions
 */
export const TokenProvider: React.FC<TokenProviderProps> = ({ children }) => {
  // Token State
  const [tokens, setTokens] = useState<DeployedToken[]>([]);
  const [allNetworksTokens, setAllNetworksTokens] = useState<Record<number, DeployedToken[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<DeployedToken | null>(null);
  
  // Get wallet state from useWallet hook
  const { provider, address: account, chainId, isConnected } = useWallet();
  
  const { getNetworkByChainId } = useNetwork();
  
  // Filtered tokens for current account and network
  const ownedTokens = useMemo(() => (
    account 
      ? tokens.filter(t => t.owner.toLowerCase() === account.toLowerCase())
      : []
  ), [tokens, account]);
  
  const networkTokens = useMemo(() => (
    chainId 
      ? tokens.filter(t => t.chainId === chainId)
      : []
  ), [tokens, chainId]);
  
  const ownedNetworkTokens = useMemo(() => (
    account && chainId
      ? tokens.filter(t => 
          t.owner.toLowerCase() === account.toLowerCase() && 
          t.chainId === chainId)
      : []
  ), [tokens, account, chainId]);
  
  // Load tokens from localStorage on initial render
  useEffect(() => {
    loadTokens();
  }, []);
  
  // Filter selected token by current connected account when address changes
  useEffect(() => {
    if (selectedToken && account) {
      // Check if the selected token is owned by the current account
      if (selectedToken.owner.toLowerCase() !== account.toLowerCase()) {
        setSelectedToken(null);
      }
    }
  }, [account, selectedToken]);
  
  // Filter selected token by current network when chainId changes
  useEffect(() => {
    if (selectedToken && chainId) {
      // Check if the selected token is on the current network
      if (selectedToken.chainId !== chainId) {
        setSelectedToken(null);
      }
    }
  }, [chainId, selectedToken]);
  
  // Effect to refresh token list when chainId changes
  useEffect(() => {
    if (!chainId || !account || !provider) return;
    refreshNetworkTokens();
  }, [chainId, account, provider]); // Dependencies updated to use state from useWallet
  
  /**
   * Load tokens from localStorage and set active tokens based on current chainId
   */
  const loadTokens = () => {
    try {
      const storedTokens = localStorage.getItem('quicktokens');
      if (storedTokens) {
        const parsedTokens = JSON.parse(storedTokens) as DeployedToken[];
        
        // Organize tokens by network
        const tokensByNetwork: Record<number, DeployedToken[]> = {};
        parsedTokens.forEach(token => {
          if (!tokensByNetwork[token.chainId]) {
            tokensByNetwork[token.chainId] = [];
          }
          tokensByNetwork[token.chainId].push(token);
        });
        
        setAllNetworksTokens(tokensByNetwork);
        
        // Set active tokens based on current chainId (now derived from useWallet)
        if (chainId && tokensByNetwork[chainId]) {
          setTokens(tokensByNetwork[chainId]);
        } else {
          // If no chainId, set to empty array initially
          setTokens([]);
        }
      }
    } catch (error) {
      console.error('Failed to load tokens from localStorage:', error);
    }
  };
  
  /**
   * Refresh tokens for the currently connected network
   */
  const refreshNetworkTokens = useCallback(async () => {
    console.log('[TokenContext] Refreshing tokens for network:', chainId);
    if (chainId && allNetworksTokens[chainId]) {
      setTokens([...allNetworksTokens[chainId]]); // Update with fresh copy
    } else if (chainId) {
      setTokens([]); // Set to empty if no tokens for this network
    } else {
      // If disconnected, tokens should already be empty via useEffect[chainId]
    }
    // Note: Add logic here later to re-fetch on-chain data if necessary
  }, [chainId, allNetworksTokens]);
  
  /**
   * Deploy a new token
   * @param params Token deployment parameters
   * @returns The address of the newly deployed token, or null if deployment failed
   */
  const deployNewToken = async (params: TokenDeployParams): Promise<string | null> => {
    if (!isConnected || !provider || !account || !chainId) {
      setError('Wallet not connected or chain ID missing');
      return null;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get signer from provider
      const signer = await provider.getSigner();
      
      // Convert values to contract format
      const initialSupplyWei = ethers.parseEther(params.initialSupply);
      const maxSupplyWei = ethers.parseEther(params.maxSupply);
      
      // Create contract factory with ABI and bytecode from QuickTokenABI
      const factory = new ethers.ContractFactory(
        QuickTokenABI as ethers.InterfaceAbi,
        (QuickTokenABI as any).bytecode,
        signer
      );
      
      // Deploy the contract
      const contract = await factory.deploy(
        params.name,
        params.symbol,
        initialSupplyWei,
        maxSupplyWei,
        params.mintFeeBps,
        params.unlockTime,
        params.platformFeeAddress
      );
      
      // Wait for deployment confirmation
      await contract.waitForDeployment();
      
      // Get contract address
      const contractAddress = await contract.getAddress();
      
      // Get network info
      const network = getNetworkByChainId(chainId);
      const networkName = network?.name || `Network ${chainId}`;
      
      // Create token record
      const newToken: DeployedToken = {
        address: contractAddress,
        name: params.name,
        symbol: params.symbol,
        initialSupply: params.initialSupply,
        maxSupply: params.maxSupply,
        decimals: 18, // ETH-compatible tokens use 18 decimals
        mintFeeBps: params.mintFeeBps,
        unlockTime: params.unlockTime,
        platformFeeAddress: params.platformFeeAddress,
        platformFeePercentage: params.mintFeeBps / 100, // Convert bps to percentage
        owner: account,
        totalSupply: params.initialSupply,
        paused: false,
        deployedAt: Math.floor(Date.now() / 1000),
        chainId: chainId
      };
      
      // Save the new token
      saveDeployedToken(newToken);
      
      // Update state immediately
      setAllNetworksTokens(prev => ({
        ...prev,
        [newToken.chainId]: [...(prev[newToken.chainId] || []), newToken]
      }));
      // Update active tokens if the new token is on the current network
      if (newToken.chainId === chainId) {
         setTokens(prev => [...prev, newToken]);
      }
      
      console.log(`Token ${newToken.name} deployed successfully!`);
      return contractAddress;
    } catch (error: any) {
      console.error('Token deployment failed:', error);
      setError(`Deployment failed: ${error.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Perform an action on a token (mint, burn, transfer, etc.)
   * @param params The action parameters
   * @returns True if the action was successful, false otherwise
   */
  const performTokenAction = async ({
    token,
    action,
    amount,
    recipient
  }: {
    token: DeployedToken;
    action: TokenAction;
    amount?: string;
    recipient?: string;
  }): Promise<boolean> => {
    if (!provider || !account) {
      setError('Wallet not connected');
      return false;
    }
    
    // Check if we're on the correct network
    if (chainId !== token.chainId) {
      const network = getNetworkByChainId(token.chainId);
      const networkName = network?.name || `Network ${token.chainId}`;
      setError(`Please switch to ${networkName} to perform this action`);
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get signer from provider
      const signer = await provider.getSigner();
      
      // Create contract instance
      const contract = new ethers.Contract(token.address, QuickTokenABI, signer);
      
      // Perform the requested action
      let tx;
      
      switch (action) {
        case 'mint':
          if (!amount) {
            throw new Error('Amount is required for minting');
          }
          
          const mintAmountWei = ethers.parseEther(amount);
          tx = await contract.mint(mintAmountWei);
          break;
          
        case 'burn':
          if (!amount) {
            throw new Error('Amount is required for burning');
          }
          
          const burnAmountWei = ethers.parseEther(amount);
          tx = await contract.burn(burnAmountWei);
          break;
          
        case 'transfer':
          if (!amount || !recipient) {
            throw new Error('Amount and recipient are required for transfers');
          }
          
          const transferAmountWei = ethers.parseEther(amount);
          tx = await contract.transfer(recipient, transferAmountWei);
          break;
          
        case 'pause':
          tx = await contract.pause();
          break;
          
        case 'unpause':
          tx = await contract.unpause();
          break;
          
        case 'approve':
          if (!amount || !recipient) {
            throw new Error('Amount and recipient are required for approvals');
          }
          
          const approveAmountWei = ethers.parseEther(amount);
          tx = await contract.approve(recipient, approveAmountWei);
          break;
      }
      
      // Wait for transaction confirmation
      await tx.wait();
      
      // Refresh token info after action
      await refreshTokenInfo(token.address);
      
      return true;
    } catch (error: any) {
      console.error(`Token action '${action}' failed:`, error);
      setError(error.message || `Failed to perform ${action}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Refresh token information from the blockchain
   * @param tokenAddress Address of the token to refresh
   */
  const refreshTokenInfo = async (tokenAddress: string): Promise<void> => {
    if (!provider) return;
    
    try {
      // Find the token in all networks
      let found = false;
      let tokenNetwork = chainId;
      let token: DeployedToken | undefined;
      
      // First, check current network tokens for better performance
      if (chainId) {
        const networkTokenList = allNetworksTokens[chainId] || [];
        const tokenIndex = networkTokenList.findIndex(t => 
          t.address.toLowerCase() === tokenAddress.toLowerCase()
        );
        
        if (tokenIndex !== -1) {
          token = networkTokenList[tokenIndex];
          found = true;
        }
      }
      
      // If not found in current network, check all networks
      if (!found) {
        for (const [networkId, networkTokens] of Object.entries(allNetworksTokens)) {
          const tokenIndex = networkTokens.findIndex(t => 
            t.address.toLowerCase() === tokenAddress.toLowerCase()
          );
          
          if (tokenIndex !== -1) {
            token = networkTokens[tokenIndex];
            tokenNetwork = parseInt(networkId);
            found = true;
            break;
          }
        }
      }
      
      if (!token || tokenNetwork === null) return;
      
      // Check if token is on the current network
      if (tokenNetwork !== chainId) {
        // Skip tokens not on the current network
        return;
      }
      
      // Create contract instance
      const contract = new ethers.Contract(tokenAddress, QuickTokenABI, provider);
      
      // Get updated token info
      const [totalSupplyWei, paused] = await Promise.all([
        contract.totalSupply(),
        contract.paused()
      ]);
      
      // Update token
      const updatedToken = {
        ...token,
        totalSupply: ethers.formatEther(totalSupplyWei),
        paused: paused
      };
      
      // Update tokens for this network
      const networkTokens = [...(allNetworksTokens[tokenNetwork] || [])];
      const tokenIndex = networkTokens.findIndex(t => 
        t.address.toLowerCase() === tokenAddress.toLowerCase()
      );
      
      if (tokenIndex !== -1) {
        networkTokens[tokenIndex] = updatedToken;
        
        // Save updated network tokens
        saveTokens(networkTokens, tokenNetwork);
        
        // Update selected token if this is the selected one
        if (selectedToken && selectedToken.address.toLowerCase() === tokenAddress.toLowerCase()) {
          setSelectedToken(updatedToken);
        }
        
        // Show notification to user about change in pause status if it changed
        if (token.paused !== paused) {
          const statusMessage = paused ? 
            `${token.name} token has been paused. Transfers are disabled.` :
            `${token.name} token has been unpaused. Transfers are now enabled.`;
          console.log(statusMessage);
        }
      }
    } catch (error) {
      console.error('Failed to refresh token info:', error);
    }
  };
  
  /**
   * Select a token for detailed view
   * @param tokenAddress Address of the token to select, or null to clear selection
   */
  const selectToken = (tokenAddress: string | null): void => {
    if (!tokenAddress) {
      setSelectedToken(null);
      return;
    }
    
    // Search for token in all networks
    for (const networkTokens of Object.values(allNetworksTokens)) {
      const token = networkTokens.find(t => 
        t.address.toLowerCase() === tokenAddress.toLowerCase()
      );
      
      if (token) {
        setSelectedToken(token);
        return;
      }
    }
    
    setSelectedToken(null);
  };
  
  /**
   * Get tokens owned by the current user
   * @param specificChainId Optional chain ID to filter by
   */
  const getOwnedTokens = (specificChainId?: number): DeployedToken[] => {
    if (!account) return [];
    
    if (specificChainId) {
      // Return owned tokens from the specified network
      return (allNetworksTokens[specificChainId] || []).filter(token => 
        token.owner.toLowerCase() === account.toLowerCase()
      );
    } else {
      // Return owned tokens from all networks
      return Object.values(allNetworksTokens)
        .flat()
        .filter(token => token.owner.toLowerCase() === account.toLowerCase());
    }
  };
  
  /**
   * Get tokens deployed on a specific network
   * @param specificChainId Optional chain ID to filter by, defaults to current network
   */
  const getNetworkTokens = (specificChainId?: number): DeployedToken[] => {
    const targetChainId = specificChainId || chainId;
    if (!targetChainId) return [];
    
    return allNetworksTokens[targetChainId] || [];
  };
  
  /**
   * Get tokens owned by the current user on a specific network
   * @param specificChainId Optional chain ID to filter by, defaults to current network
   */
  const getOwnedNetworkTokens = (specificChainId?: number): DeployedToken[] => {
    if (!account) return [];
    
    const targetChainId = specificChainId || chainId;
    if (!targetChainId) return [];
    
    return (allNetworksTokens[targetChainId] || []).filter(token => 
      token.owner.toLowerCase() === account.toLowerCase()
    );
  };
  
  /**
   * Find a token by its address
   * @param address Token address to find
   * @param specificChainId Optional chain ID to filter by
   */
  const findToken = (address: string, specificChainId?: number): DeployedToken | undefined => {
    if (specificChainId) {
      // Search in specific network
      return (allNetworksTokens[specificChainId] || []).find(token => 
        token.address.toLowerCase() === address.toLowerCase()
      );
    } else {
      // Search in all networks
      for (const networkTokens of Object.values(allNetworksTokens)) {
        const token = networkTokens.find(t => 
          t.address.toLowerCase() === address.toLowerCase()
        );
        
        if (token) return token;
      }
      
      return undefined;
    }
  };
  
  /**
   * Import a token from a contract address
   * @param address Token contract address to import
   */
  const importToken = async (address: string): Promise<boolean> => {
    if (!provider || !chainId) {
      setError('Wallet not connected');
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if token already exists in this network
      const existingToken = findToken(address, chainId);
      if (existingToken) {
        setError('Token already imported');
        return false;
      }
      
      // Create contract instance
      const contract = new ethers.Contract(address, QuickTokenABI, provider);
      
      // Check if this is a QuickToken
      try {
        // Try to call QuickToken-specific methods
        await Promise.all([
          contract.mintFeeBps(),
          contract.unlockTime(),
          contract.platformFeeAddress()
        ]);
      } catch (e) {
        setError('Not a valid QuickToken contract');
        return false;
      }
      
      // Get token information
      const [
        name, 
        symbol, 
        totalSupplyWei,
        maxSupplyWei,
        decimals,
        mintFeeBps,
        unlockTime,
        platformFeeAddress,
        owner,
        paused
      ] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.totalSupply(),
        contract.maxSupply(),
        contract.decimals(),
        contract.mintFeeBps(),
        contract.unlockTime(),
        contract.platformFeeAddress(),
        contract.owner(),
        contract.paused()
      ]);
      
      // Create token record
      const newToken: DeployedToken = {
        address,
        name,
        symbol,
        initialSupply: ethers.formatEther(totalSupplyWei), // Assuming initial = current for imports
        maxSupply: ethers.formatEther(maxSupplyWei),
        decimals: Number(decimals),
        mintFeeBps: Number(mintFeeBps),
        unlockTime: Number(unlockTime),
        platformFeeAddress,
        platformFeePercentage: Number(mintFeeBps) / 100, // Convert bps to percentage
        owner,
        totalSupply: ethers.formatEther(totalSupplyWei),
        paused,
        deployedAt: Math.floor(Date.now() / 1000), // Use current time as import time
        chainId
      };
      
      // Update tokens for this network
      const networkTokens = [...(allNetworksTokens[chainId] || []), newToken];
      
      // Save updated tokens
      saveTokens(networkTokens, chainId);
      
      // Show success notification
      const network = getNetworkByChainId(chainId);
      const networkName = network?.name || `Network ${chainId}`;
      console.log(`Token ${symbol} imported from ${networkName}`);
      
      return true;
    } catch (error: any) {
      console.error('Token import failed:', error);
      setError(error.message || 'Failed to import token');
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Save tokens to localStorage, organized by network
   */
  // Wrap saveTokens in useCallback
  const saveTokens = useCallback((updatedTokens: DeployedToken[], targetChainId: number) => {
    try {
      // Update network-specific tokens
      const updatedNetworkTokens = {
        ...allNetworksTokens,
        [targetChainId]: updatedTokens
      };
      
      // Flatten all tokens for storage
      const allTokens = Object.values(updatedNetworkTokens).flat();
      
      // Save to localStorage
      localStorage.setItem('quicktokens', JSON.stringify(allTokens));
      
      // Update state
      setAllNetworksTokens(updatedNetworkTokens);
      
      // Update current tokens if we're on this network
      if (chainId === targetChainId) {
        setTokens(updatedTokens);
      }
    } catch (error) {
      console.error('Failed to save tokens to localStorage:', error);
    }
  }, [allNetworksTokens, chainId, setAllNetworksTokens, setTokens]); // Add dependencies
  
  // Wrap refreshNetworkTokens in useCallback
  const refreshAllTokens = useCallback(async (): Promise<void> => {
    if (!provider || !chainId) return;
    
    // We can only refresh the current network's tokens
    await refreshNetworkTokens();
  }, [provider, chainId, refreshNetworkTokens]);
  
  // Wrap functions intended for context value in useCallback
  const deployNewTokenCallback = useCallback(deployNewToken, [isConnected, provider, account, chainId, allNetworksTokens, getNetworkByChainId, saveTokens]);
  const performTokenActionCallback = useCallback(performTokenAction, [provider, account, chainId, getNetworkByChainId, refreshTokenInfo]); // refreshTokenInfo needs to be stable
  const refreshTokenInfoCallback = useCallback(refreshTokenInfo, [provider, chainId, allNetworksTokens, selectedToken, saveTokens]);
  // refreshNetworkTokens is already wrapped in useCallback
  const refreshAllTokensCallback = useCallback(refreshAllTokens, [provider, chainId, refreshNetworkTokens]);
  const selectTokenCallback = useCallback(selectToken, [allNetworksTokens]);
  const getOwnedTokensCallback = useCallback(getOwnedTokens, [account, allNetworksTokens]);
  const getNetworkTokensCallback = useCallback(getNetworkTokens, [chainId, allNetworksTokens]);
  const getOwnedNetworkTokensCallback = useCallback(getOwnedNetworkTokens, [account, chainId, allNetworksTokens]);
  const findTokenCallback = useCallback(findToken, [allNetworksTokens]);
  const importTokenCallback = useCallback(importToken, [provider, chainId, allNetworksTokens, findToken, saveTokens]);

  // Compile context value - use useMemo
  const contextValue = useMemo((): TokenContextValue => ({
    tokens,
    ownedTokens, // Recalculated inline, but memoized by useMemo overall
    networkTokens, // Recalculated inline, but memoized by useMemo overall
    ownedNetworkTokens, // Recalculated inline, but memoized by useMemo overall
    allNetworksTokens,
    isLoading,
    error,
    selectedToken,
    // Use the useCallback wrapped functions
    deployToken: deployNewTokenCallback, 
    performTokenAction: performTokenActionCallback,
    refreshTokenInfo: refreshTokenInfoCallback,
    refreshNetworkTokens, // Already useCallback
    refreshAllTokens: refreshAllTokensCallback,
    selectToken: selectTokenCallback,
    getOwnedTokens: getOwnedTokensCallback,
    getNetworkTokens: getNetworkTokensCallback,
    getOwnedNetworkTokens: getOwnedNetworkTokensCallback,
    findToken: findTokenCallback,
    importToken: importTokenCallback
  // Dependencies for useMemo: all state and stable functions used
  }), [ 
    tokens, 
    ownedTokens, 
    networkTokens, 
    ownedNetworkTokens, 
    allNetworksTokens,
    isLoading, 
    error, 
    selectedToken, 
    deployNewTokenCallback, 
    performTokenActionCallback,
    refreshTokenInfoCallback, 
    refreshNetworkTokens, 
    refreshAllTokensCallback, 
    selectTokenCallback, 
    getOwnedTokensCallback, 
    getNetworkTokensCallback, 
    getOwnedNetworkTokensCallback, 
    findTokenCallback, 
    importTokenCallback 
  ]);

  return (
    <TokenContext.Provider value={contextValue}>
      {children}
    </TokenContext.Provider>
  );
};

export default TokenContext;