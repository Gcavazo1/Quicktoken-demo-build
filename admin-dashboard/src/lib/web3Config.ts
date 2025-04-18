import { createConfig, http } from 'wagmi'
import { mainnet, sepolia, goerli, polygon, polygonMumbai, bsc, bscTestnet, arbitrum, avalanche, base, optimism, fantom, baseGoerli, gnosis, zkSync, linea, scroll } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'
import { createWeb3Modal } from '@web3modal/wagmi'

// Check if we're running on the client
const isClient = typeof window !== 'undefined'

// 1. Get Project ID - safely check for env variables
let projectId = ''
if (isClient && typeof process !== 'undefined') {
  projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''
  
  if (!projectId) {
    console.warn('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set in environment variables')
  }
}

// 2. Define supported chains - Type as const array to satisfy TypeScript
const supportedChains = [
  mainnet, goerli, sepolia, polygon, polygonMumbai, bsc, bscTestnet,
  arbitrum, avalanche, base, optimism, fantom, baseGoerli, gnosis,
  zkSync, linea, scroll
] as const;

// 3. Create dApp metadata
const metadata = {
  name: 'QuickToken Dashboard',
  description: 'Deploy and manage your ERC-20 tokens',
  url: 'https://quicktoken-dashboard-demo.vercel.app/',
  icons: [] // Add icon URL(s) when available
}

// 4. Create Wagmi config - Only on client
export const wagmiConfig = isClient ? createConfig({
  chains: supportedChains,
  transports: {
    // Use http transport provider for each chain
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [goerli.id]: http(),
    [polygon.id]: http(),
    [polygonMumbai.id]: http(),
    [bsc.id]: http(),
    [bscTestnet.id]: http(),
    [arbitrum.id]: http(),
    [avalanche.id]: http(),
    [base.id]: http(),
    [optimism.id]: http(),
    [fantom.id]: http(),
    [baseGoerli.id]: http(),
    [gnosis.id]: http(),
    [zkSync.id]: http(),
    [linea.id]: http(),
    [scroll.id]: http(),
  },
  connectors: [
    injected(), // Standard injected providers (window.ethereum)
    walletConnect({ projectId }) // WalletConnect
  ]
}) : null as any; // Provide a null with type assertion for SSR

// 5. Initialize Web3Modal with the Wagmi config
// This must be called before any component uses useWeb3Modal
if (isClient && wagmiConfig && projectId) {
  try {
    createWeb3Modal({
      wagmiConfig,
      projectId,
      themeMode: 'light', // or 'dark' based on your app's theme
      themeVariables: {
        // Customize theme if needed
        // '--w3m-accent-color': '#3B82F6',
      }
    })
  } catch (error) {
    console.error('Failed to initialize Web3Modal:', error)
  }
} 