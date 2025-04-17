import { useTokens as useTokensContext } from '../contexts/TokenContext';
import { DeployedToken, TokenActionParams, TokenDeployParams, TokenAction } from '../lib/types/tokens';

/**
 * Hook for token management
 * Provides a focused API for token operations using the TokenContext.
 * Filtering logic is now handled within the context itself.
 */
export const useTokens = () => {
  // Get all state and actions directly from the context
  const context = useTokensContext(); 

  // Removed filtering functions (getOwnedTokens, getNetworkTokens, getOwnedNetworkTokens)
  // Components should use the memoized lists provided by the context:
  // context.ownedTokens, context.networkTokens, context.ownedNetworkTokens

  // Simple wrapper for findToken (could also be used directly from context)
  const findToken = (tokenAddress: string): DeployedToken | undefined => {
    // Use the context's findToken function which searches across all networks by default
    return context.findToken(tokenAddress);
  };
  
  // Wrapper for mintTokens action
  const mintTokens = async (
    tokenAddress: string, 
    amount: string, 
    recipient?: string
  ): Promise<boolean> => {
    const token = context.findToken(tokenAddress); // Use context's findToken
    if (!token) {
        console.error(`Token not found for minting: ${tokenAddress}`);
        return false;
    }
    return context.performTokenAction({
      token,
      action: 'mint',
      amount,
      recipient
    });
  };
  
  // Wrapper for burnTokens action
  const burnTokens = async (
    tokenAddress: string, 
    amount: string
  ): Promise<boolean> => {
    const token = context.findToken(tokenAddress); // Use context's findToken
    if (!token) {
        console.error(`Token not found for burning: ${tokenAddress}`);
        return false;
    }
    return context.performTokenAction({
      token,
      action: 'burn',
      amount
    });
  };
  
  // Wrapper for transferTokens action
  const transferTokens = async (
    tokenAddress: string,
    amount: string,
    recipient: string
  ): Promise<boolean> => {
    const token = context.findToken(tokenAddress); // Use context's findToken
    if (!token) {
        console.error(`Token not found for transfer: ${tokenAddress}`);
        return false;
    }
    return context.performTokenAction({
      token,
      action: 'transfer',
      amount,
      recipient
    });
  };
  
  // Wrapper for context's deployToken (submitDeployment)
  const deploy = async (params: TokenDeployParams): Promise<DeployedToken | null> => {
    // Directly call the context function
    return context.deployToken(params);
  };
  
  // Wrapper for refreshTokenInfo
  const refreshToken = async (tokenAddress: string): Promise<void> => {
    return context.refreshTokenInfo(tokenAddress);
  };
  
  // Wrapper for selectToken
  const select = (tokenAddress: string | null): void => {
    context.selectToken(tokenAddress);
  };
  
  // Return the context values directly, plus any convenience wrappers if needed
  return {
    // State directly from context
    tokens: context.tokens,
    ownedTokens: context.ownedTokens, // Use context's memoized version
    networkTokens: context.networkTokens, // Use context's memoized version
    ownedNetworkTokens: context.ownedNetworkTokens, // Use context's memoized version
    selectedToken: context.selectedToken,
    isLoading: context.isLoading,
    error: context.error,
    
    // Actions (mostly direct pass-through or simple wrappers)
    deployToken: deploy, 
    mintTokens, 
    burnTokens,
    transferTokens,
    refreshToken,
    selectToken: select,
    findToken,
    performTokenAction: context.performTokenAction, // Direct pass-through
    refreshNetworkTokens: context.refreshNetworkTokens // Direct pass-through
  };
};

export default useTokens; 