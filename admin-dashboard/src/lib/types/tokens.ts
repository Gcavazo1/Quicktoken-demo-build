/**
 * Token-related type definitions
 */

/**
 * Parameters used to deploy a new QuickToken
 */
export interface TokenDeployParams {
  name: string;
  symbol: string;
  initialSupply: string;
  maxSupply: string;
  mintFeeBps: number;
  unlockTime: number;
  platformFeeAddress: string;
}

/**
 * Represents a deployed QuickToken instance
 */
export interface DeployedToken {
  // Contract identifiers
  address: string;
  name: string;
  symbol: string;
  
  // Token configuration
  initialSupply: string;
  maxSupply: string;
  decimals: number;
  mintFeeBps: number;
  unlockTime: number;
  platformFeeAddress: string;
  platformFeePercentage: number;
  
  // Ownership and state
  owner: string;
  totalSupply: string;
  paused: boolean;
  
  // Metadata
  deployedAt: number;
  chainId: number;
}

/**
 * Partial token data when only basic display info is needed
 */
export interface TokenDisplayInfo {
  address: string;
  name: string;
  symbol: string;
  chainId: number;
}

/**
 * Token balance information
 */
export interface TokenBalance {
  token: TokenDisplayInfo;
  balance: string;
  formattedBalance: string;
}

/**
 * Type for token management actions
 */
export type TokenAction = 'mint' | 'burn' | 'transfer' | 'approve' | 'pause' | 'unpause';

/**
 * Parameters for token actions
 */
export interface TokenActionParams {
  token: DeployedToken;
  action: TokenAction;
  amount?: string;
  recipient?: string;
} 