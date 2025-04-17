import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { DeployedToken, TokenDeployParams, TokenAction } from '../lib/types/tokens';
import { QuickTokenABI } from '../lib/QuickTokenABI';
import { deployToken as libDeployToken, loadTokensByNetwork, saveDeployedToken, saveMultipleTokens } from '../lib/deployToken';
import { Provider } from '../lib/types/web3';
import { useNetwork } from './NetworkContext';
import { useWallet } from '../hooks/useWallet';
import { fetchTokenDetailsFromChain } from '../utils/tokenUtils';

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
  deployToken: (params: TokenDeployParams) => Promise<DeployedToken | null>;
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
  importToken: (address: string) => Promise<DeployedToken | null>;
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
  importToken: async () => null
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
  
  const networkContext = useNetwork();
  const { getNetworkByChainId } = networkContext;
  
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
  const loadTokens = useCallback(() => {
    console.log('[TokenContext] loadTokens started...');
    try {
      // Use the new helper function which returns the network-organized object
      const loadedNetworkTokens = loadTokensByNetwork(); 
      console.log('[TokenContext] loadTokensByNetwork returned:', loadedNetworkTokens); 
      
      // Set the state containing all tokens organized by network
      setAllNetworksTokens(loadedNetworkTokens);
      
      // Derive the active 'tokens' state from the loaded map based on current chainId
      if (chainId) {
        const currentNetworkTokens = loadedNetworkTokens[chainId] || [];
        console.log(`[TokenContext] Setting active tokens for chain ${chainId}:`, currentNetworkTokens);
        setTokens(currentNetworkTokens);
      } else {
        console.log('[TokenContext] No network connected, setting active tokens to empty.');
        setTokens([]); // Set empty if no chainId connected
      }
    } catch (error) {
      console.error('Failed to load tokens:', error);
      setAllNetworksTokens({});
      setTokens([]);
    }
  }, [chainId]); // Dependency includes chainId so it re-runs when network changes

  // Load tokens on initial mount and when chainId changes
  useEffect(() => {
    loadTokens();
  }, [loadTokens]); // Depend on the memoized loadTokens function
  
  /**
   * Refresh tokens for the currently connected network
   */
  const refreshNetworkTokens = useCallback(async () => {
    // Simply re-run loadTokens which now correctly reads from localStorage and sets state
    console.log('[TokenContext] Refresh triggered, reloading tokens...');
    loadTokens();
    // Note: Add logic here later to re-fetch on-chain data if necessary
  }, [loadTokens]);
  
  /**
   * Submit a deployment request, handle deployment, save result, and update state.
   * @param params Token deployment parameters
   * @returns Promise<DeployedToken | null> The deployed token object or null on failure.
   */
  const submitDeployment = async (params: TokenDeployParams): Promise<DeployedToken | null> => {
    if (!isConnected || !provider || !account || !chainId) {
      setError('Wallet not connected or chain ID missing');
      return null;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Call the library function to perform the actual deployment
      console.log('[TokenContext] Calling library deployToken...');
      const newToken = await libDeployToken(provider, params);
      console.log('[TokenContext] Library deployToken returned:', newToken);
      
      // Save the new token using the library function
      console.log('[TokenContext] Saving new token to localStorage:', newToken);
      saveDeployedToken(newToken);
      console.log('[TokenContext] Token saved. Reloading tokens state...');
      
      // Reload state from localStorage to include the new token
      loadTokens(); 
      
      console.log(`Token ${newToken.name} deployment submitted and state reloaded!`);
      return newToken; // Return the full token object on success

    } catch (error: any) {
      // Handle errors from libDeployToken (including user rejection)
      console.error('Token deployment submission failed:', error);
      // Set error state based on the caught error
      setError(error.message || 'Deployment failed for an unknown reason.'); 
      return null; // Indicate failure
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
    setIsLoading(true);
    setError(null);
  
    if (!provider) {
      setError('No provider available');
      setIsLoading(false);
      return false;
    }

    if (!account) {
      setError('Wallet not connected');
      setIsLoading(false);
      return false;
    }
    
    // Early check for paused tokens - prevents transfer attempts entirely
    if (token.paused && (action === 'transfer')) {
      setError('Token transfers are paused');
      setIsLoading(false);
      throw new Error('Token transfers are paused');
    }
    
    if (chainId !== token.chainId) {
      const network = getNetworkByChainId(token.chainId);
      const networkName = network?.name || `Network ${token.chainId}`;
      setError(`Please switch to ${networkName} to perform this action`);
      return false;
    }
    
    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(token.address, QuickTokenABI, signer);
      
      let tx;
      let txOptions: ethers.Overrides = {}; // Initialize transaction options
      
      switch (action) {
        case 'mint':
          if (!amount) throw new Error('Amount is required for minting');
          const mintAmountWei = ethers.parseUnits(amount, token.decimals); // Use token specific decimals
          
          // Calculate required mint fee
          const requiredFeeWei = await contract.calculateMintFee(mintAmountWei);
          console.log(`[TokenContext] Calculated mint fee (wei): ${requiredFeeWei.toString()}`);
          
          // Check user's balance before attempting mint
          const userBalance = await provider.getBalance(account);
          console.log(`[TokenContext] User ETH balance: ${userBalance.toString()}`);
          console.log(`[TokenContext] Required ETH (fee + gas estimate): ${requiredFeeWei.toString()}`);
          
          // We need the fee amount plus some ETH for gas (~0.01 ETH for safety margin)
          const estimatedGasCost = ethers.parseEther("0.01"); // Safety margin for gas
          const totalRequired = requiredFeeWei + estimatedGasCost;
          
          if (userBalance < totalRequired) {
            const shortfall = totalRequired - userBalance;
            console.log(`[TokenContext] Insufficient funds. Short by: ${ethers.formatEther(shortfall)} ETH`);
            
            // Set error state but DON'T throw - just return early
            const errorMessage = `Insufficient ETH in your wallet. You need approximately ${ethers.formatEther(totalRequired)} ETH but only have ${ethers.formatEther(userBalance)} ETH.`;
            setError(errorMessage);
            setIsLoading(false);
            return false; // Return false without throwing an actual Error object
          }
          
          txOptions.value = requiredFeeWei; // Set the msg.value for the transaction
          console.log(`[TokenContext] Sending mint transaction with value: ${txOptions.value}`);
          
          // If balance check passed, proceed with the transaction
          tx = await contract.mint(account, mintAmountWei, txOptions); 
          break;
          
        case 'burn':
          if (!amount) throw new Error('Amount is required for burning');
          const burnAmountWei = ethers.parseUnits(amount, token.decimals); // Use token specific decimals
          tx = await contract.burn(burnAmountWei);
          break;
          
        case 'transfer':
          if (!amount || !recipient) {
            setError('Amount and recipient are required for transfers');
            setIsLoading(false);
            return false;
          }
          
          const transferAmountWei = ethers.parseUnits(amount, token.decimals); // Use token specific decimals
          
          try {
            // Explicitly estimate gas first to catch reverts early
            await contract.transfer.estimateGas(recipient, transferAmountWei);
            
            // If estimateGas didn't throw, proceed with the actual transaction
            tx = await contract.transfer(recipient, transferAmountWei);
          } catch (transferError: any) {
            // Handle transfer errors without throwing
            console.error(`[TokenContext] Transfer estimateGas failed:`, transferError);
            let errorMsg = 'Failed to transfer tokens';
            
            if (transferError.message) {
              errorMsg = transferError.message.replace('execution reverted: ', '');
            }
            
            setError(errorMsg);
            setIsLoading(false);
            return false;
          }
          break;
          
        case 'pause':
          tx = await contract.pause();
          break;
          
        case 'unpause':
          tx = await contract.unpause();
          break;
          
        case 'approve':
          if (!amount || !recipient) throw new Error('Amount and recipient are required for approvals');
          const approveAmountWei = ethers.parseUnits(amount, token.decimals); // Use token specific decimals
          tx = await contract.approve(recipient, approveAmountWei);
          break;
      }
      
      console.log(`[TokenContext] Transaction submitted (${action}), waiting for confirmation...`, tx.hash);
      await tx.wait();
      console.log(`[TokenContext] Transaction confirmed (${action}):`, tx.hash);
      
      // Refresh token info after action
      await refreshTokenInfo(token.address);
      
      return true;
    } catch (error: any) {
      console.error(`[TokenContext] Token action '${action}' failed:`, error);
      // Attempt to parse more specific contract revert reasons or user actions
      let errorMessage = `Failed to perform ${action}`;
      
      // Enhanced rejection detection - check multiple patterns
      const isRejection = 
        error.code === 'ACTION_REJECTED' || 
        error.code === 4001 || 
        (error.info?.error?.code === 4001) ||
        error.message?.includes('rejected') ||
        error.message?.includes('denied') ||
        error.reason === 'rejected';
        
      if (isRejection) {
        errorMessage = "Transaction rejected by user.";
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
          errorMessage = "Insufficient ETH in your wallet to cover transaction fee and mint cost.";
      } else if (error.reason) { // Ethers v6 often includes reason for reverts
         errorMessage = error.reason;
      } else if (error.data?.message) { // Check for nested error messages
         errorMessage = error.data.message;
      } else if (error.message) {
         errorMessage = error.message;
      }
      // Clean up common prefixes
      errorMessage = errorMessage.replace('execution reverted: ', '').replace('VM Exception while processing transaction: reverted with reason string ','');

      setError(errorMessage);
      // Instead of re-throwing, return false with the error message
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
      
      // Get updated token info & user balance
      const callPromises = [
        contract.totalSupply(),
        contract.paused()
      ];
      if (account) { // Only fetch balance if account is connected
        callPromises.push(contract.balanceOf(account));
      }
      
      const [totalSupplyWei, paused, userBalanceWei] = await Promise.all(callPromises);
      
      // Update token
      const updatedToken: DeployedToken = {
        ...token,
        totalSupply: ethers.formatUnits(totalSupplyWei, token.decimals), // Use formatUnits
        paused: paused,
        userBalance: account && userBalanceWei ? ethers.formatUnits(userBalanceWei, token.decimals) : undefined // Use formatUnits
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
   * Import a token from a contract address using fetchTokenDetailsFromChain
   * @param address Token contract address to import
   * @returns Promise<DeployedToken | null> The imported token object or null on failure/duplicate.
   */
  const importTokenImplementation = async (address: string): Promise<DeployedToken | null> => {
    if (!provider || !chainId) {
      setError('Wallet not connected or network invalid');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Check if token already exists in the current network
      // Use the useCallback version of findToken
      const existingToken = findToken(address, chainId); 
      if (existingToken) {
        console.log(`[TokenContext] Token ${address} already exists on network ${chainId}.`);
        setError('Token already added to this network.');
        return null; 
      }

      // 2. Fetch token details from chain
      console.log(`[TokenContext] Calling fetchTokenDetailsFromChain for ${address}...`);
      const details = await fetchTokenDetailsFromChain(
        address,
        chainId,
        provider,
        networkContext 
      );
      console.log(`[TokenContext] Fetched details for ${address}:`, details);

      // 3. Create a DeployedToken object with placeholders
      const newToken: DeployedToken = {
        address: address, 
        chainId: chainId,
        name: details.name,
        symbol: details.symbol,
        decimals: details.decimals,
        owner: details.owner, 
        totalSupply: details.totalSupply,
        initialSupply: details.totalSupply, 
        maxSupply: details.totalSupply,     
        mintFeeBps: 0,                
        unlockTime: 0,                
        platformFeeAddress: '0x0000000000000000000000000000000000000000', 
        platformFeePercentage: 0,     
        paused: false,                
        deployedAt: Math.floor(Date.now() / 1000), 
      };
      console.log(`[TokenContext] Created new token object:`, newToken);

      // 4. Save the new token using the library function
      console.log(`[TokenContext] Saving imported token ${newToken.symbol} to localStorage...`);
      saveDeployedToken(newToken);

      // 5. Reload tokens state from localStorage to include the new token
      console.log(`[TokenContext] Reloading tokens state...`);
      // Use the useCallback version of loadTokens
      loadTokens(); 

      console.log(`[TokenContext] Token ${newToken.symbol} imported successfully!`);
      return newToken; 

    } catch (error: any) {
      console.error('[TokenContext] Token import failed:', error);
      setError(error.message || 'Failed to import token.');
      return null; 
    } finally {
      setIsLoading(false);
    }
  }; // End of importTokenImplementation
  
  /**
   * Save tokens to localStorage, organized by network
   */
  // Wrap saveTokens in useCallback
  const saveTokens = useCallback((updatedTokens: DeployedToken[], targetChainId: number) => {
    try {
      // Update network-specific tokens in state
      const updatedNetworkTokens = {
        ...allNetworksTokens,
        [targetChainId]: updatedTokens
      };
      
      // Update state first
      setAllNetworksTokens(updatedNetworkTokens);
      
      // Update current tokens if we're on this network
      if (chainId === targetChainId) {
        setTokens(updatedTokens);
      }
      
      // Save each updated token to localStorage using the helper function
      // This ensures consistent storage format
      updatedTokens.forEach(token => {
        // Make sure the token has the right chainId before saving
        const tokenToSave = { ...token, chainId: targetChainId };
        saveDeployedToken(tokenToSave);
      });
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
  const submitDeploymentCallback = useCallback(submitDeployment, [isConnected, provider, account, chainId, loadTokens]);
  const performTokenActionCallback = useCallback(performTokenAction, [provider, account, chainId, getNetworkByChainId, refreshTokenInfo]);
  const refreshTokenInfoCallback = useCallback(refreshTokenInfo, [provider, chainId, allNetworksTokens, selectedToken, saveTokens]);
  const refreshNetworkTokensCallback = useCallback(refreshNetworkTokens, [loadTokens]); // Added dependency
  const refreshAllTokensCallback = useCallback(refreshAllTokens, [provider, chainId, refreshNetworkTokensCallback]); // Use callback dependency
  const selectTokenCallback = useCallback(selectToken, [allNetworksTokens]);
  const getOwnedTokensCallback = useCallback(getOwnedTokens, [account, allNetworksTokens]);
  const getNetworkTokensCallback = useCallback(getNetworkTokens, [chainId, allNetworksTokens]);
  const getOwnedNetworkTokensCallback = useCallback(getOwnedNetworkTokens, [account, chainId, allNetworksTokens]);
  const findTokenCallback = findToken; // Already wrapped in useCallback above
  // Use the new implementation function in the callback
  const importTokenCallback = useCallback(importTokenImplementation, [provider, chainId, findToken, networkContext, saveDeployedToken, loadTokens]);

  // Compile context value - use useMemo
  const contextValue = useMemo((): TokenContextValue => ({
    tokens,
    ownedTokens,
    networkTokens,
    ownedNetworkTokens,
    allNetworksTokens,
    isLoading,
    error,
    selectedToken,
    deployToken: submitDeploymentCallback,
    performTokenAction: performTokenActionCallback,
    refreshTokenInfo: refreshTokenInfoCallback,
    refreshNetworkTokens: refreshNetworkTokensCallback,
    refreshAllTokens: refreshAllTokensCallback,
    selectToken: selectTokenCallback,
    getOwnedTokens: getOwnedTokensCallback,
    getNetworkTokens: getNetworkTokensCallback,
    getOwnedNetworkTokens: getOwnedNetworkTokensCallback,
    findToken: findTokenCallback,
    importToken: importTokenCallback // Ensure the correct callback is passed
  }), [
    tokens,
    ownedTokens,
    networkTokens,
    ownedNetworkTokens,
    allNetworksTokens,
    isLoading,
    error,
    selectedToken,
    submitDeploymentCallback,
    performTokenActionCallback,
    refreshTokenInfoCallback,
    refreshNetworkTokensCallback,
    refreshAllTokensCallback,
    selectTokenCallback,
    getOwnedTokensCallback,
    getNetworkTokensCallback,
    getOwnedNetworkTokensCallback,
    findTokenCallback,
    importTokenCallback // Add the new callback as dependency
  ]);

  return (
    <TokenContext.Provider value={contextValue}>
      {children}
    </TokenContext.Provider>
  );
};

export default TokenContext;