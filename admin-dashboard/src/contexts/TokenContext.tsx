import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { DeployedToken, TokenDeployParams, TokenAction } from '../lib/types/tokens';
import { QuickTokenABI } from '../lib/QuickTokenABI';
import { deployToken, loadDeployedTokens, saveDeployedToken, saveMultipleTokens } from '../lib/deployToken';
import WalletConnector from '../services/WalletConnector';
import { Provider } from '../lib/types/web3';
import { useNotification } from './NotificationContext';
import { useNetwork } from './NetworkContext';

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
  // State
  const [tokens, setTokens] = useState<DeployedToken[]>([]);
  const [allNetworksTokens, setAllNetworksTokens] = useState<Record<number, DeployedToken[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<DeployedToken | null>(null);
  
  // Get wallet connection state
  const [provider, setProvider] = useState<Provider | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  
  const { showNotification } = useNotification();
  const { currentNetwork, getNetworkByChainId } = useNetwork();
  
  // Filtered tokens for current account and network
  const ownedTokens = account 
    ? tokens.filter(t => t.owner.toLowerCase() === account.toLowerCase())
    : [];
  
  const networkTokens = chainId 
    ? tokens.filter(t => t.chainId === chainId)
    : [];
  
  const ownedNetworkTokens = account && chainId
    ? tokens.filter(t => 
        t.owner.toLowerCase() === account.toLowerCase() && 
        t.chainId === chainId)
    : [];
  
  // Update connection state when the component mounts
  useEffect(() => {
    updateConnectionState();
    
    // Check for connection changes periodically
    const intervalId = setInterval(updateConnectionState, 5000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Update the wallet connection state from the service
  const updateConnectionState = async () => {
    const { provider: connectedProvider, account: connectedAccount, chainId: connectedChainId } = 
      await WalletConnector.getConnectionState();
    
    setProvider(connectedProvider);
    setAccount(connectedAccount);
    setChainId(connectedChainId);
  };
  
  // Load tokens from localStorage on initial render
  useEffect(() => {
    loadTokens();
  }, []);
  
  // Filter tokens by current connected account when address changes
  useEffect(() => {
    if (selectedToken && account) {
      // Check if the selected token is owned by the current account
      if (selectedToken.owner.toLowerCase() !== account.toLowerCase()) {
        setSelectedToken(null);
      }
    }
  }, [account, selectedToken]);
  
  // Also filter by current network
  useEffect(() => {
    if (selectedToken && chainId) {
      // Check if the selected token is on the current network
      if (selectedToken.chainId !== chainId) {
        setSelectedToken(null);
      }
    }
  }, [chainId, selectedToken]);
  
  /**
   * Load tokens from localStorage
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
        
        // Set active tokens based on current chainId
        if (chainId && tokensByNetwork[chainId]) {
          setTokens(tokensByNetwork[chainId]);
        } else {
          setTokens(parsedTokens);
        }
      }
    } catch (error) {
      console.error('Failed to load tokens from localStorage:', error);
      showNotification('Failed to load saved tokens', 'error');
    }
  };
  
  /**
   * Deploy a new token
   * @param params Token deployment parameters
   * @returns The address of the newly deployed token, or null if deployment failed
   */
  const deployNewToken = async (params: TokenDeployParams): Promise<string | null> => {
    if (!provider || !account || !chainId) {
      setError('Wallet not connected');
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
      
      // Update tokens for this network
      const updatedTokens = [...(allNetworksTokens[chainId] || []), newToken];
      
      // Save updated tokens
      saveTokens(updatedTokens, chainId);
      
      // Show success notification
      showNotification(`Token ${params.symbol} deployed on ${networkName}`, 'success');
      
      return contractAddress;
    } catch (error: any) {
      console.error('Token deployment failed:', error);
      setError(error.message || 'Failed to deploy token');
      showNotification('Token deployment failed', 'error');
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
      showNotification(`Please switch to ${networkName}`, 'warning');
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
      if (chainId !== tokenNetwork) {
        console.log(`Token is on network ID ${tokenNetwork}, skipping refresh`);
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
          showNotification(statusMessage, paused ? 'warning' : 'success');
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
      showNotification(`Token ${symbol} imported from ${networkName}`, 'success');
      
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
  const saveTokens = (updatedTokens: DeployedToken[], targetChainId: number) => {
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
  };
  
  /**
   * Refresh information for all tokens on the current network
   */
  const refreshNetworkTokens = async (): Promise<void> => {
    if (!provider || !chainId) return;
    
    setIsLoading(true);
    
    try {
      // Get tokens on the current network
      const tokensToRefresh = allNetworksTokens[chainId] || [];
      const updatedTokens: DeployedToken[] = [];
      
      // Refresh each token sequentially
      for (const token of tokensToRefresh) {
        try {
          // Create contract instance
          const contract = new ethers.Contract(token.address, QuickTokenABI, provider);
          
          // Get updated token info
          const [totalSupplyWei, paused] = await Promise.all([
            contract.totalSupply(),
            contract.paused()
          ]);
          
          // Update token
          const updatedToken = {
            ...token,
            totalSupply: ethers.formatEther(totalSupplyWei),
            paused
          };
          
          updatedTokens.push(updatedToken);
        } catch (error) {
          console.error(`Failed to refresh token ${token.address}:`, error);
          // If we can't refresh, keep the original token
          updatedTokens.push(token);
        }
      }
      
      // Save all updated tokens
      if (updatedTokens.length > 0) {
        // Save to localStorage
        saveTokens(updatedTokens, chainId);
        
        // Update selected token if it's on this network
        if (selectedToken && selectedToken.chainId === chainId) {
          const updatedSelected = updatedTokens.find(t => 
            t.address.toLowerCase() === selectedToken.address.toLowerCase()
          );
          if (updatedSelected) {
            setSelectedToken(updatedSelected);
          }
        }
      }
    } catch (error) {
      console.error('Failed to refresh network tokens:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Refresh information for all tokens across all networks
   * Note: This uses the current provider, so it will only work for the current network
   */
  const refreshAllTokens = async (): Promise<void> => {
    if (!provider || !chainId) return;
    
    // We can only refresh the current network's tokens
    await refreshNetworkTokens();
  };
  
  // Compile context value
  const contextValue: TokenContextValue = {
    tokens,
    ownedTokens,
    networkTokens,
    ownedNetworkTokens,
    allNetworksTokens,
    isLoading,
    error,
    selectedToken,
    deployToken: deployNewToken,
    performTokenAction,
    refreshTokenInfo,
    refreshNetworkTokens,
    refreshAllTokens,
    selectToken,
    getOwnedTokens,
    getNetworkTokens,
    getOwnedNetworkTokens,
    findToken,
    importToken
  };
  
  return (
    <TokenContext.Provider value={contextValue}>
      {children}
    </TokenContext.Provider>
  );
};

export default TokenContext;