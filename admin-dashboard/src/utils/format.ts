/**
 * Truncates an Ethereum address for display purposes
 * 
 * @param address The full Ethereum address
 * @returns Shortened address in format: 0x1234...5678
 */
export const truncateAddress = (address: string): string => {
  if (!address) return '';
  
  const start = address.substring(0, 6);
  const end = address.substring(address.length - 4);
  
  return `${start}...${end}`;
};

/**
 * Formats a timestamp into a readable date string
 * 
 * @param timestamp Unix timestamp in seconds
 * @returns Formatted date string
 */
export const formatDate = (timestamp: number): string => {
  if (!timestamp) return 'Not set';
  
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Returns the etherscan URL for a given address or transaction
 * 
 * @param chainId The network chain ID
 * @param value Address or transaction hash
 * @param type Type of value (address or tx)
 * @returns Full etherscan URL
 */
export const getExplorerUrl = (
  chainId: number,
  value: string,
  type: 'address' | 'tx' = 'address'
): string => {
  let baseUrl = 'https://etherscan.io';
  
  // Ethereum networks
  if (chainId === 5) baseUrl = 'https://goerli.etherscan.io';
  if (chainId === 11155111) baseUrl = 'https://sepolia.etherscan.io';
  
  // Polygon networks
  if (chainId === 137) baseUrl = 'https://polygonscan.com';
  if (chainId === 80001) baseUrl = 'https://mumbai.polygonscan.com';
  
  // BSC networks
  if (chainId === 56) baseUrl = 'https://bscscan.com';
  if (chainId === 97) baseUrl = 'https://testnet.bscscan.com';

  return `${baseUrl}/${type}/${value}`;
};

/**
 * Formats a numeric value with the given number of decimal places
 *
 * @param value The numeric value to format
 * @param decimals Number of decimal places to display
 * @returns Formatted string with commas for thousands separator
 */
export const formatNumber = (value: number | string, decimals: number = 2): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '0';
  
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

/**
 * Returns network name based on chainId
 * 
 * @param chainId The network chain ID
 * @returns Network name
 */
export const getNetworkName = (chainId: number): string => {
  const networks: Record<number, string> = {
    1: 'Ethereum',
    5: 'Goerli',
    11155111: 'Sepolia',
    137: 'Polygon',
    80001: 'Mumbai',
    56: 'BSC',
    97: 'BSC Testnet',
    1337: 'Localhost',
    31337: 'Hardhat'
  };
  
  return networks[chainId] || `Chain ID ${chainId}`;
}; 