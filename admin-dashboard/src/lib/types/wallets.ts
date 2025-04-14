/**
 * Wallet-related type definitions
 */

/**
 * Supported wallet types
 */
export type WalletType = 'metamask' | 'coinbase' | 'wallet-connect' | null;

/**
 * Wallet connection state
 */
export interface WalletState {
  isConnecting: boolean;
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  walletType: WalletType;
  error: string | null;
}

/**
 * Wallet connection methods
 */
export interface WalletActions {
  connect: (walletType: Exclude<WalletType, null>) => Promise<boolean>;
  disconnect: () => void;
  switchNetwork: (chainId: number) => Promise<boolean>;
}

/**
 * Combined wallet context value
 */
export interface WalletContextValue extends WalletState, WalletActions {}

/**
 * Options for wallet connection
 */
export interface WalletConnectionOptions {
  appName?: string;
  appLogoUrl?: string;
  infuraId?: string;
  defaultChainId?: number;
}

/**
 * Connect result from wallet connection
 */
export interface ConnectResult {
  success: boolean;
  address?: string;
  chainId?: number;
  error?: string;
} 