/**
 * Wallet-related type definitions
 */

/**
 * Wallet connection state
 * Note: This might be redundant if useWallet return type is used directly.
 * Keeping for now, but review usage later.
 */
export interface WalletState {
  isConnecting: boolean;
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  error: string | null;
}

/**
 * Wallet connection methods
 * Note: This might be redundant if useWallet return type is used directly.
 * Keeping for now, but review usage later.
 */
export interface WalletActions {
  connect: (rdns: string) => Promise<boolean>;
  disconnect: () => void;
  switchNetwork: (chainId: number) => Promise<boolean>;
}

/**
 * Combined wallet context value
 * Note: This might be redundant if useWallet return type is used directly.
 * Keeping for now, but review usage later.
 */
export interface WalletContextValue extends WalletState, WalletActions {} 