import { useTokens as useTokensContext } from '../contexts/TokenContext';
import { DeployedToken, TokenActionParams, TokenDeployParams, TokenAction } from '../lib/types/tokens';
import { useWallet } from './useWallet';

/**
 * Hook for token management
 * Provides a focused API for token operations with additional utilities
 */
export const useTokens = () => {
  const {
    tokens,
    isLoading,
    error,
    selectedToken,
    deployToken,
    performTokenAction,
    refreshTokenInfo,
    selectToken
  } = useTokensContext();

  // Get wallet information
  const { address, chainId } = useWallet();

  /**
   * Get tokens owned by the current wallet
   */
  const getOwnedTokens = (): DeployedToken[] => {
    if (!address) return [];
    
    return tokens.filter(token => 
      token.owner.toLowerCase() === address.toLowerCase()
    );
  };
  
  /**
   * Get tokens deployed on the current network
   */
  const getNetworkTokens = (): DeployedToken[] => {
    if (!chainId) return [];
    
    return tokens.filter(token => token.chainId === chainId);
  };
  
  /**
   * Get owned tokens on the current network
   */
  const getOwnedNetworkTokens = (): DeployedToken[] => {
    if (!address || !chainId) return [];
    
    return tokens.filter(token => 
      token.owner.toLowerCase() === address.toLowerCase() && 
      token.chainId === chainId
    );
  };
  
  /**
   * Find a token by address
   */
  const findToken = (tokenAddress: string): DeployedToken | null => {
    return tokens.find(t => 
      t.address.toLowerCase() === tokenAddress.toLowerCase()
    ) || null;
  };
  
  /**
   * Mint tokens
   */
  const mintTokens = async (
    tokenAddress: string, 
    amount: string, 
    recipient?: string
  ): Promise<boolean> => {
    const token = findToken(tokenAddress);
    if (!token) return false;
    
    return performTokenAction({
      token,
      action: 'mint',
      amount,
      recipient
    });
  };
  
  /**
   * Burn tokens
   */
  const burnTokens = async (
    tokenAddress: string, 
    amount: string
  ): Promise<boolean> => {
    const token = findToken(tokenAddress);
    if (!token) return false;
    
    return performTokenAction({
      token,
      action: 'burn',
      amount
    });
  };
  
  /**
   * Transfer tokens
   */
  const transferTokens = async (
    tokenAddress: string,
    amount: string,
    recipient: string
  ): Promise<boolean> => {
    const token = findToken(tokenAddress);
    if (!token) return false;
    
    return performTokenAction({
      token,
      action: 'transfer',
      amount,
      recipient
    });
  };
  
  /**
   * Deploy a new token
   */
  const deploy = async (params: TokenDeployParams): Promise<DeployedToken | null> => {
    const tokenAddress = await deployToken(params);
    if (tokenAddress && typeof tokenAddress === 'string') {
      // Return the deployed token object
      return findToken(tokenAddress);
    }
    return null;
  };
  
  /**
   * Refresh token information
   */
  const refreshToken = async (tokenAddress: string): Promise<void> => {
    return refreshTokenInfo(tokenAddress);
  };
  
  /**
   * Select a token for detailed view
   */
  const select = (tokenAddress: string | null): void => {
    selectToken(tokenAddress);
  };
  
  return {
    // State
    tokens,
    ownedTokens: getOwnedTokens(),
    networkTokens: getNetworkTokens(),
    ownedNetworkTokens: getOwnedNetworkTokens(),
    selectedToken,
    isLoading,
    error,
    
    // Token operations
    deployToken: deploy,
    mintTokens,
    burnTokens,
    transferTokens,
    refreshToken,
    selectToken: select,
    findToken,
    performTokenAction
  };
};

export default useTokens; 