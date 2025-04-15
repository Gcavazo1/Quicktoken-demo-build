/**
 * Network-related constants and utilities
 */

/**
 * Network information type
 */
export interface NetworkInfo {
  chainId: number;
  name: string;
  shortName: string;
  isTestnet: boolean;
  currency: string | {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrl: string;
  blockExplorerUrl: string;
  iconUrl?: string;
  // Add alias for testnet to maintain compatibility
  testnet?: boolean;
  // Add alias for explorerUrl to maintain compatibility
  explorerUrl?: string;
  isDefault?: boolean;
}

/**
 * Chain ID mapping to network information
 */
export const NETWORKS: Record<number, NetworkInfo> = {
  1: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    shortName: 'Ethereum',
    isTestnet: false,
    testnet: false,
    currency: 'ETH',
    rpcUrl: 'https://mainnet.infura.io/v3/',
    blockExplorerUrl: 'https://etherscan.io',
    explorerUrl: 'https://etherscan.io'
  },
  5: {
    chainId: 5,
    name: 'Goerli Testnet',
    shortName: 'Goerli',
    isTestnet: true,
    testnet: true,
    currency: 'ETH',
    rpcUrl: 'https://goerli.infura.io/v3/',
    blockExplorerUrl: 'https://goerli.etherscan.io',
    explorerUrl: 'https://goerli.etherscan.io'
  },
  11155111: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    shortName: 'Sepolia',
    isTestnet: true,
    testnet: true,
    currency: 'ETH',
    rpcUrl: 'https://sepolia.infura.io/v3/',
    blockExplorerUrl: 'https://sepolia.etherscan.io',
    explorerUrl: 'https://sepolia.etherscan.io'
  },
  137: {
    chainId: 137,
    name: 'Polygon Mainnet',
    shortName: 'Polygon',
    isTestnet: false,
    testnet: false,
    currency: 'MATIC',
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorerUrl: 'https://polygonscan.com',
    explorerUrl: 'https://polygonscan.com'
  },
  80001: {
    chainId: 80001,
    name: 'Mumbai Testnet',
    shortName: 'Mumbai',
    isTestnet: true,
    testnet: true,
    currency: 'MATIC',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    blockExplorerUrl: 'https://mumbai.polygonscan.com',
    explorerUrl: 'https://mumbai.polygonscan.com'
  },
  56: {
    chainId: 56,
    name: 'BNB Smart Chain',
    shortName: 'BSC',
    isTestnet: false,
    testnet: false,
    currency: 'BNB',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    blockExplorerUrl: 'https://bscscan.com',
    explorerUrl: 'https://bscscan.com'
  },
  97: {
    chainId: 97,
    name: 'BSC Testnet',
    shortName: 'BSC Testnet',
    isTestnet: true,
    testnet: true,
    currency: 'BNB',
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    blockExplorerUrl: 'https://testnet.bscscan.com',
    explorerUrl: 'https://testnet.bscscan.com'
  },
  1337: {
    chainId: 1337,
    name: 'Local Network',
    shortName: 'Localhost',
    isTestnet: true,
    testnet: true,
    currency: 'ETH',
    rpcUrl: 'http://localhost:8545',
    blockExplorerUrl: '',
    explorerUrl: ''
  },
  31337: {
    chainId: 31337,
    name: 'Hardhat Network',
    shortName: 'Hardhat',
    isTestnet: true,
    testnet: true,
    currency: 'ETH',
    rpcUrl: 'http://localhost:8545',
    blockExplorerUrl: '',
    explorerUrl: ''
  },
  // --- Add Arbitrum ---
  42161: {
    chainId: 42161,
    name: 'Arbitrum One',
    shortName: 'Arbitrum',
    isTestnet: false,
    testnet: false,
    currency: 'ETH',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    blockExplorerUrl: 'https://arbiscan.io',
    explorerUrl: 'https://arbiscan.io'
  },
  // --- Add Avalanche ---
  43114: {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    shortName: 'Avalanche',
    isTestnet: false,
    testnet: false,
    currency: 'AVAX',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    blockExplorerUrl: 'https://snowtrace.io',
    explorerUrl: 'https://snowtrace.io'
  },
  // --- Add Base ---
  8453: {
    chainId: 8453,
    name: 'Base',
    shortName: 'Base',
    isTestnet: false,
    testnet: false,
    currency: 'ETH',
    rpcUrl: 'https://mainnet.base.org',
    blockExplorerUrl: 'https://basescan.org',
    explorerUrl: 'https://basescan.org'
  },
  // --- Add Optimism ---
  10: {
    chainId: 10,
    name: 'Optimism',
    shortName: 'Optimism',
    isTestnet: false,
    testnet: false,
    currency: 'ETH',
    rpcUrl: 'https://mainnet.optimism.io',
    blockExplorerUrl: 'https://optimistic.etherscan.io',
    explorerUrl: 'https://optimistic.etherscan.io'
  },
  // --- Add Fantom ---
  250: {
    chainId: 250,
    name: 'Fantom Opera',
    shortName: 'Fantom',
    isTestnet: false,
    testnet: false,
    currency: 'FTM',
    rpcUrl: 'https://rpc.ftm.tools',
    blockExplorerUrl: 'https://ftmscan.com',
    explorerUrl: 'https://ftmscan.com'
  },
  // --- Add Base Goerli ---
  84531: {
    chainId: 84531,
    name: 'Base Goerli',
    shortName: 'Base Goerli',
    isTestnet: true,
    testnet: true,
    currency: 'ETH',
    rpcUrl: 'https://goerli.base.org',
    blockExplorerUrl: 'https://goerli.basescan.org',
    explorerUrl: 'https://goerli.basescan.org'
  },
  // --- Add Gnosis ---
  100: {
    chainId: 100,
    name: 'Gnosis',
    shortName: 'Gnosis',
    isTestnet: false,
    testnet: false,
    currency: 'xDAI',
    rpcUrl: 'https://rpc.gnosischain.com',
    blockExplorerUrl: 'https://gnosisscan.io',
    explorerUrl: 'https://gnosisscan.io'
  },
  // --- Add zkSync Era ---
  324: {
    chainId: 324,
    name: 'zkSync Era',
    shortName: 'zkSync',
    isTestnet: false,
    testnet: false,
    currency: 'ETH',
    rpcUrl: 'https://mainnet.era.zksync.io',
    blockExplorerUrl: 'https://explorer.zksync.io',
    explorerUrl: 'https://explorer.zksync.io'
  },
  // --- Add Linea ---
  59144: {
    chainId: 59144,
    name: 'Linea',
    shortName: 'Linea',
    isTestnet: false,
    testnet: false,
    currency: 'ETH',
    rpcUrl: 'https://rpc.linea.build',
    blockExplorerUrl: 'https://lineascan.build',
    explorerUrl: 'https://lineascan.build'
  },
  // --- Add Scroll ---
  534352: {
    chainId: 534352,
    name: 'Scroll',
    shortName: 'Scroll',
    isTestnet: false,
    testnet: false,
    currency: 'ETH',
    rpcUrl: 'https://rpc.scroll.io',
    blockExplorerUrl: 'https://scrollscan.com',
    explorerUrl: 'https://scrollscan.com'
  }
};

/**
 * Get network name based on chainId
 * @param chainId The network chain ID
 * @returns Full network name or fallback with chain ID
 */
export const getNetworkName = (chainId: number): string => {
  return NETWORKS[chainId]?.name || `Chain ID ${chainId}`;
};

/**
 * Get network short name based on chainId
 * @param chainId The network chain ID
 * @returns Short network name or fallback with chain ID
 */
export const getNetworkShortName = (chainId: number): string => {
  return NETWORKS[chainId]?.shortName || `Chain ${chainId}`;
};

/**
 * Determine if a network is a testnet
 * @param chainId The network chain ID
 * @returns True if the network is a testnet
 */
export const isTestnet = (chainId: number): boolean => {
  return NETWORKS[chainId]?.isTestnet || false;
};

/**
 * Get network currency symbol
 * @param chainId The network chain ID
 * @returns Currency symbol
 */
export const getNetworkCurrency = (chainId: number): string => {
  const currency = NETWORKS[chainId]?.currency;
  if (!currency) return 'ETH';
  
  return typeof currency === 'string' ? currency : currency.symbol;
};

/**
 * Returns the block explorer URL for a given address or transaction
 * @param chainId The network chain ID
 * @param value Address or transaction hash
 * @param type Type of value (address or tx)
 * @returns Full block explorer URL
 */
export const getExplorerUrl = (
  chainId: number,
  value: string,
  type: 'address' | 'tx' = 'address'
): string => {
  const baseUrl = NETWORKS[chainId]?.blockExplorerUrl;
  
  if (!baseUrl) {
    return '';
  }
  
  return `${baseUrl}/${type}/${value}`;
};

/**
 * Returns badge styling class based on the network type
 * @param chainId The network chain ID
 * @returns CSS class name for proper styling
 */
export const getNetworkBadgeClass = (chainId: number): string => {
  // Mainnet networks
  if ([1, 137, 56].includes(chainId)) {
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
  }
  // Testnet networks
  if ([5, 11155111, 80001, 97].includes(chainId)) {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
  }
  // Local networks
  if ([1337, 31337].includes(chainId)) {
    return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
  }
  // Unknown networks
  return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
}; 