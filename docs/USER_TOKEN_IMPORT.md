# User Token Import Feature Plan (Revised)

## 1. Overview

This document outlines the implementation plan for allowing any user to add existing ERC20 tokens to their personal dashboard view by providing a contract address. This enhances usability by allowing users to track tokens they interact with, even if those tokens aren't part of the core configuration.

## 2. Goals

*   Allow users to add custom tokens via contract address on the currently selected network.
*   Fetch token details (Name, Symbol, Decimals, Owner, Total Supply) directly from the blockchain using the contract's ABI.
*   Persist the user's added tokens in their browser's `localStorage` using the **existing token storage mechanism**.
*   Integrate seamlessly with the existing token display and network switching.
*   Keep the implementation frontend-only.

## 3. Implementation Strategy

### 3.1. Core Logic: Fetching Token Details

*   **Get ABI:** When a user provides a contract address, the frontend will query the relevant blockchain explorer's public API (e.g., Etherscan, PolygonScan) using the `getabi` action to retrieve the contract's ABI.
*   **Direct Contract Interaction:** Using the fetched ABI, the contract address, and the user's connected wallet provider (`ethers.js`), the frontend will directly call standard ERC20 view functions (`name()`, `symbol()`, `decimals()`, `owner()`, `totalSupply()`) on the contract.
*   **Error Handling:** Gracefully handle cases where the ABI cannot be fetched, the contract doesn't implement the standard functions, or other network errors occur.

### 3.2. Storage (Revised)

*   User-added tokens will be stored **in the existing `localStorage` key (`'quicktokens'`)** alongside tokens deployed via the dashboard.
*   The existing functions `loadTokensByNetwork` (implicitly used by `loadTokens` in context) and `saveDeployedToken` (from `lib/deployToken.ts`) will be used for reading and writing.
*   This maintains a single, consistent source of truth for all tokens known to the dashboard in the user's browser.
*   Existing warnings about data loss upon clearing browser storage remain relevant for *all* tokens displayed (both deployed via app and imported).

### 3.3. UI/UX

*   **Trigger:** An "Add Existing Token" button will be added to the main dashboard view (`Dashboard.tsx`).
*   **Modal:** Clicking the button will open a modal (`AddTokenModal.tsx`).
    *   Input field for the contract address.
    *   Display of the currently selected network (read-only).
    *   "Fetch Info" button.
    *   Display area for fetched details or errors.
    *   Loading indicator.
    *   "Add to Dashboard" button, enabled after successful fetching.

### 3.4. Context Integration (Revised)

*   **`TokenContext` (`admin-dashboard/src/contexts/TokenContext.tsx`):**
    *   Implement the existing `importToken` function stub.
    *   Signature: `async function importToken(address: string, chainId: number): Promise<DeployedToken | null>`
    *   Logic:
        *   Check if token `address` already exists in `allNetworksTokens[chainId]`. Return `null` or the existing token if found to prevent duplicates.
        *   Call `fetchTokenDetailsFromChain(address, chainId, provider, networkContext)`.
        *   If details (`name`, `symbol`, `decimals`, `owner`, `totalSupply`) are fetched successfully:
            *   Create a `DeployedToken` object:
                *   Use fetched `address`, `chainId`, `name`, `symbol`, `decimals`, `owner`, `totalSupply`.
                *   Set placeholder/default values for fields not available from standard ERC20 interface: `initialSupply` (can use `totalSupply`), `maxSupply` (can use `totalSupply` or indicate unknown), `mintFeeBps` (set to 0 or indicate unknown), `unlockTime` (set to 0 or epoch start), `platformFeeAddress` (use config default or indicate unknown), `deployedAt` (use current timestamp), `paused` (assume `false`).
            *   Call `saveDeployedToken(newToken)` (imported from `lib/deployToken.ts`) to add it to `localStorage`.
            *   Call `loadTokens()` to refresh the context state.
            *   Return the `newToken`.
        *   If fetching fails, set an `error` state in the context and return `null`.
*   **`NetworkContext`:** Used to retrieve the explorer API URL.
*   **`useWallet`:** Used to retrieve the `ethers.js` provider.

## 4. Key Components & Files (Updated Paths/Info)

*   **Utility:** `admin-dashboard/src/utils/tokenUtils.ts` (new function `fetchTokenDetailsFromChain`)
*   **UI Component:** `admin-dashboard/src/components/AddTokenModal.tsx` (new component)
*   **Context:** `admin-dashboard/src/contexts/TokenContext.tsx` (implement `importToken` function)
*   **Library Functions:** `admin-dashboard/src/lib/deployToken.ts` (use `saveDeployedToken`, `loadTokensByNetwork`)
*   **UI Integration:** `admin-dashboard/src/pages/Dashboard.tsx` (add button/modal trigger)
*   **Documentation:** `docs/USER_TOKEN_IMPORT.md` (this file)
*   **Storage Key:** `'quicktokens'` (implicitly used by `lib/deployToken.ts` functions)

## 5. Potential Limitations & Considerations (Updated)

*   **Explorer API Reliability:** Public APIs for `getabi` might be rate-limited.
*   **Non-Standard Tokens:** Fetching details (`name`, `symbol`, etc.) via direct contract calls will fail if the contract doesn't implement them.
*   **Placeholder Data:** Imported tokens will have estimated or default values for fields like `initialSupply`, `maxSupply`, `mintFeeBps`, `unlockTime`, etc., as these are not standard ERC20 view functions.
*   **Data Loss:** All tokens (imported or deployed via app) are lost if browser data is cleared.
*   **API Keys:** Still avoided in this plan.

## 6. Development Steps (Revised)

1.  Implement `fetchTokenDetailsFromChain` utility function (including owner, totalSupply fetch).
2.  Implement `AddTokenModal` component UI and basic state.
3.  Implement the `importToken` function within `TokenContext.tsx` using the logic described above (fetching details, creating `DeployedToken` with placeholders, calling `saveDeployedToken`, calling `loadTokens`).
4.  Integrate `AddTokenModal` trigger into `Dashboard.tsx`.
5.  Connect `AddTokenModal` logic to call `tokenContext.importToken`.
6.  Test thoroughly. 