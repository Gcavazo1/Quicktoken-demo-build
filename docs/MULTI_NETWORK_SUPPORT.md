# Multi-Network Support

This document outlines the multi-network support feature implemented in the QuickToken commercial template.

## Overview

The multi-network support allows platform owners to configure multiple blockchain networks for token deployment. Users can then select which network they want to deploy their tokens on, providing flexibility to support both mainnet and testnet environments.

## Supported Networks

QuickToken provides pre-configured support for a comprehensive list of networks:

### Mainnet Networks
- Ethereum Mainnet
- Polygon
- Binance Smart Chain (BSC)
- Base
- Optimism
- Arbitrum
- Avalanche
- Fantom

### Testnet Networks
- Sepolia Testnet
- Goerli Testnet
- Mumbai (Polygon Testnet)
- Base Goerli

### Additional Networks
- Gnosis Chain
- zkSync Era
- Linea
- Scroll

Platform owners can easily select which networks they want to enable for their users. Each network comes pre-configured with the appropriate chain ID, RPC URL, and block explorer URL.

## Features

- **Configure Multiple Networks**: During setup, platform owners can add multiple networks with their respective RPC URLs, chain IDs, and explorer URLs.
- **Enable/Disable Networks**: Networks can be individually enabled or disabled.
- **Network Switching**: Users can switch between configured networks in the dashboard.
- **Network Validation**: The system validates that the user's wallet is connected to the selected network.
- **Network Management**: Clear UI for managing network configurations.
- **Custom Networks**: In addition to the pre-configured networks, platform owners can add custom networks with their specific parameters.
- **Network-Specific Token Management**: Tokens are tracked and displayed by network, making it clear which tokens are deployed on which networks.

## Token Management Across Networks

The system has been built to efficiently manage tokens across different networks:

- **Network-Organized Storage**: Tokens are stored in localStorage organized by network ID, allowing for efficient retrieval.
- **Network Filtering**: Tokens can be filtered by network to show only tokens deployed on the current network.
- **Cross-Network Operations**: While most token operations are network-specific, users can view tokens across all networks.
- **Network State Preservation**: When switching networks, token state is preserved and automatically refreshed.
- **Auto-Refresh**: Token data is automatically refreshed when the user switches networks.

## Implementation Details

### Configuration Structure

Networks are stored in the QuickTokenConfig object:

```typescript
export interface QuickTokenConfig {
  // Other configuration fields...
  networks: {
    // Legacy network flags (maintained for backward compatibility)
    mainnet: boolean;
    goerli: boolean;
    sepolia: boolean;
    polygon: boolean;
    mumbai: boolean;
    arbitrum: boolean;
    optimism: boolean;
    // New multi-network configuration
    configuredNetworks: Array<{
      name: string;
      chainId: string;
      rpcUrl: string;
      explorerUrl: string;
      isEnabled: boolean;
    }>;
  };
}
```

### Token Storage Structure

Tokens are stored in localStorage with the following structure:

```typescript
// Network-organized token storage
{
  "1": [ /* Ethereum Mainnet tokens */ ],
  "137": [ /* Polygon tokens */ ],
  "11155111": [ /* Sepolia Testnet tokens */ ],
  // other networks...
}
```

### Components

1. **NetworkSettings** (in SetupWizard.tsx):
   - UI for adding, removing, and configuring networks during setup
   - Form validation for network details
   - Quick-select options for common networks

2. **NetworkSelector** (NetworkSelector.tsx):
   - Displays a dropdown of configured networks
   - Shows network status (connected/wrong network)
   - Handles network switching

3. **Dashboard** (Dashboard.tsx):
   - Manages current network state
   - Handles network switching requests
   - Passes network configuration to child components
   - Refreshes token data when network changes

4. **DeployForm** (DeployForm.tsx):
   - Validates that the current network is configured
   - Shows network compatibility warnings
   - Displays a list of available networks if on wrong network

5. **TokenContext** (TokenContext.tsx):
   - Provides methods to filter tokens by network
   - Manages token data across networks
   - Refreshes token data when network changes

### User Flow

1. **Setup Phase**:
   - Platform owner configures one or more networks
   - Each network requires name, chain ID, RPC URL, and explorer URL
   - Networks can be enabled/disabled

2. **Dashboard Usage**:
   - User connects wallet
   - User selects network from dropdown
   - System validates wallet's network matches selected network
   - If networks don't match, system prompts user to switch
   - Deployment is only allowed on configured networks
   - Token data is filtered by current network

3. **Token Management**:
   - Tokens are displayed by current network
   - Operations on tokens are validated against current network
   - Network switching refreshes token data

## Network Switching

The system uses the wallet provider's API (e.g., MetaMask) to request network switching:

```typescript
// Request network switch
await window.ethereum.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: chainIdHex }],
});

// If network doesn't exist in wallet, add it
await window.ethereum.request({
  method: 'wallet_addEthereumChain',
  params: [{
    chainId: chainIdHex,
    chainName: networkConfig.name,
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [networkConfig.rpcUrl],
    blockExplorerUrls: [networkConfig.explorerUrl],
  }],
});
```

## Benefits

- **Comprehensive Network Support**: Out-of-the-box support for all major EVM networks
- **Flexibility**: Deploy tokens on multiple networks from a single dashboard
- **Testnet Development**: Easy testing on testnets before mainnet deployment
- **User Control**: Clear UI for network selection and switching
- **Error Prevention**: Validation to prevent deployment on incorrect networks
- **Future-proof**: Architecture designed to easily add support for new networks as they emerge
- **Efficient Storage**: Network-organized token storage for better performance
- **Automatic Refresh**: Token data refreshes when switching networks 