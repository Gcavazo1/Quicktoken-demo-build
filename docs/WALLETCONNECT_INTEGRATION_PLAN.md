# WalletConnect Integration Plan

This document outlines the steps to integrate WalletConnect functionality into the QuickToken Admin Dashboard, enabling connections with mobile wallets via deep linking and QR codes.

## 1. Background & Goal

The current wallet connection logic relies solely on EIP-6963, limiting connections to browser extensions. The goal is to add support for WalletConnect to enable connections from mobile wallets.

## 2. Core Strategy

Leverage standard Web3 libraries, specifically Wagmi and Web3Modal (v3+ for ethers v6 compatibility), to handle wallet connections. This involves replacing the custom `WalletConnector.ts` service and `useWallet.ts` hook with Wagmi's core hooks and using Web3Modal's UI.

## 3. Dependencies

Install or update the following dependencies:

```bash
npm install @web3modal/ethers@latest ethers@latest wagmi@latest @tanstack/react-query@latest
# OR if using yarn:
yarn add @web3modal/ethers@latest ethers@latest wagmi@latest @tanstack/react-query@latest
```
*(**Note:** Assuming ethers v6 compatibility is desired/present. Adjust versions if needed based on project specifics.)*

## 4. Implementation Steps

### Step 4.1: Configure Wagmi & Web3Modal

1.  **Create Configuration File:** Create a new file (e.g., `admin-dashboard/src/lib/web3Config.ts` or similar).
2.  **Define Chains:** Import necessary chain definitions from `wagmi/chains` based on the networks intended to be supported (can be dynamically generated from `dashboard-config.json` later if needed, but start with static definitions).
3.  **Get Project ID:** Read the `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` from `process.env`. Ensure it's defined and throw an error during build if not.
4.  **Configure Metadata:** Define metadata for the dApp (name, description, URL, icons) required by WalletConnect.
5.  **Initialize EthersProvider:** Use `@web3modal/ethers`'s `EthersStoreUtil.setConfig` or similar setup to configure the provider using the WalletConnect Project ID and metadata.
6.  **Wagmi Config (Optional but Recommended):** Although Web3Modal v3 can operate standalone with ethers, integrating `wagmi` provides robust hooks. If using Wagmi:
    *   Import `createConfig` from `wagmi`.
    *   Import connectors like `walletConnect`, `injected`, `eip6963` from `wagmi/connectors`.
    *   Create the Wagmi config using `createConfig`, passing the defined chains and configured connectors.

### Step 4.2: Wrap Application with Providers

1.  **Modify `AppProviders.tsx`:**
    *   Import the Wagmi configuration (`WagmiConfig`) if created.
    *   Wrap the existing providers (or the application root) with `<WagmiConfig config={config}>`.
    *   *(Self-correction: Web3Modal v3 doesn't require a context provider wrapper anymore if using its standalone ethers configuration.)* If *not* using the full Wagmi `createConfig` approach and only `@web3modal/ethers`, no explicit wrapper might be needed here, but initialization logic from `web3Config.ts` needs to be called somewhere (e.g., in `_app.tsx` or the main layout). If using full Wagmi, the `WagmiConfig` wrapper is needed. Let's assume the full Wagmi approach for better hook integration.

### Step 4.3: Replace `useWallet` Hook Logic

1.  **Identify Components:** Find all components currently importing and using `useWallet.ts`.
2.  **Replace Hook Calls:**
    *   Replace `const { address, isConnected, chainId } = useWallet()` with `const { address, isConnected, chainId } = useAccount()` from `wagmi`.
    *   Replace `const { connectWallet } = useWallet()` with `const { open } = useWeb3Modal()` from `@web3modal/ethers/react`. The `connectWallet` button's `onClick` handler will now call `open()`.
    *   Replace `const { disconnectWallet } = useWallet()` with `const { disconnect } = useDisconnect()` from `wagmi`.
    *   Replace `const { changeNetwork } = useWallet()` with `const { switchChain } = useSwitchChain()` from `wagmi`.
    *   Replace `const { provider } = useWallet()`: Direct provider access is less common with Wagmi hooks. If needed for specific Ethers calls, use `useConnectorClient` or `usePublicClient` from `wagmi` to get a Viem client and potentially adapt it or use Wagmi's `readContract`/`writeContract` actions.
    *   Replace state variables like `isConnecting`, `isInitializing`, `error` with status flags returned by Wagmi hooks (e.g., `useAccount` returns `status`, `useConnect` returns `isPending`, `error`).
3.  **Remove `useWallet.ts`:** Once all usages are refactored, delete the `admin-dashboard/src/hooks/useWallet.ts` file.

### Step 4.4: Remove `WalletConnector.ts`

1.  Verify that `WalletConnector.ts` is no longer imported or used anywhere (especially by the refactored `useWallet` or its replacements).
2.  Delete the `admin-dashboard/src/services/WalletConnector.ts` file.

### Step 4.5: Replace `WalletSelectorModal.tsx`

1.  **Identify Usage:** Find where `WalletSelectorModal.tsx` is currently rendered (likely triggered by a connect button in `Dashboard.tsx` or a header component).
2.  **Remove Rendering:** Remove the code that renders `<WalletSelectorModal ... />`.
3.  **Implement `useWeb3Modal`:** In the component containing the "Connect Wallet" button:
    *   Import `useWeb3Modal` from `@web3modal/ethers/react`.
    *   Call `const { open } = useWeb3Modal()`.
    *   Set the `onClick` handler of the "Connect Wallet" button to call `open()`.
4.  **Delete `WalletSelectorModal.tsx`:** Delete the `admin-dashboard/src/components/WalletSelectorModal.tsx` file.

## 5. Testing

*   **Desktop:**
    *   Test connecting via browser extensions (MetaMask, Coinbase Wallet) through Web3Modal.
    *   Test connecting via WalletConnect QR code using a mobile wallet.
    *   Test disconnecting.
    *   Test network switching.
*   **Mobile:**
    *   Access the deployed dashboard on a mobile browser.
    *   Test connecting via deep linking using installed mobile wallets (MetaMask, Coinbase Wallet, Rainbow, etc.).
    *   Test disconnecting.
    *   Test network switching.

## 6. Security Considerations

*   The `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is intentionally public and required by the WalletConnect SDK. It is safe to expose via `NEXT_PUBLIC_` environment variables.
*   Ensure no other sensitive keys (like private keys or Infura IDs if they were still used) are exposed in the frontend bundle. 