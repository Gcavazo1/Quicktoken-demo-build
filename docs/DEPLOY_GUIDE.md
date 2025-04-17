## Multi-Network Deployment Guide

This section provides detailed instructions for deploying and managing your QuickToken across multiple blockchain networks.

### Prerequisites

Before deploying to multiple networks, ensure:

1. You have access to the desired networks in your wallet (MetaMask, Coinbase Wallet)
2. You have sufficient native tokens for each network to cover gas fees
3. You've configured RPC endpoints for each network in the Setup Wizard

### Network Configuration

#### Supported Networks

QuickToken supports deployment on the following networks out of the box:

| Network Name | Chain ID | Token | Type |
|--------------|----------|-------|------|
| Ethereum Mainnet | 1 | ETH | Production |
| Polygon | 137 | MATIC | Production |
| Binance Smart Chain | 56 | BNB | Production |
| Arbitrum | 42161 | ETH | Production |
| Optimism | 10 | ETH | Production |
| Goerli Testnet | 5 | GoerliETH | Test |
| Sepolia Testnet | 11155111 | SepoliaETH | Test |
| Mumbai Testnet | 80001 | MATIC | Test |
| BSC Testnet | 97 | BNB | Test |

#### Custom Network Configuration

To add a custom network:

1. Navigate to the Setup Wizard
2. Select "Network Settings"
3. Click "Add Custom Network"
4. Provide:
   - Network Name
   - Chain ID (numeric)
   - RPC URL
   - Block Explorer URL
   - Symbol (native token symbol)

### Deployment Process

#### 1. Connect Wallet

1. Open the QuickToken dashboard
2. Click "Connect Wallet"
3. Select your preferred wallet provider
4. Approve the connection request

#### 2. Select Network

1. After connecting, use the network selector in the top right
2. Choose the network where you wish to deploy
3. If prompted by your wallet, approve the network switch

#### 3. Deploy Token

1. Fill in the token parameters:
   - Token Name
   - Token Symbol (3-5 characters recommended)
   - Initial Supply (initial tokens to mint)
   - Maximum Supply (total token cap)
   - Mint Fee (basis points, 100 = 1%)
   - Platform Fee Address (optional)

2. Click "Deploy Token"
3. Review the deployment summary
4. Confirm the transaction in your wallet
5. Wait for transaction confirmation

#### 4. Verify Contract (Optional but Recommended)

1. After deployment, click "Verify Contract"
2. The system will attempt automatic verification
3. If successful, you'll see a "Verified" badge
4. If manual verification is needed, follow the on-screen instructions

### Cross-Network Management

#### Using Same Token on Multiple Networks

To maintain brand consistency, you can deploy with identical parameters across networks:

1. Deploy on your primary network first
2. Note all parameters used
3. Switch to secondary network
4. Use identical Name and Symbol
5. Deploy with matching parameters

**Note**: Each deployment creates a separate token contract. These are not bridged tokens and will have independent supplies and values.

#### Network-Specific Considerations

| Network | Gas Price | Confirmation Time | Special Notes |
|---------|-----------|-------------------|--------------|
| Ethereum | High | 1-5 minutes | Best for high-value tokens |
| Polygon | Very Low | 5-10 seconds | Best for frequent transactions |
| BSC | Low | 5-15 seconds | Large user base in Asia |
| Arbitrum | Medium | 10-15 seconds | Ethereum security with lower fees |
| Optimism | Medium | 10-15 seconds | Simple bridging to Ethereum |

### Managing Multi-Network Tokens

Once deployed across multiple networks:

1. **Network Switching**: Use the network selector to switch between networks
2. **Token Selection**: Your tokens will be filtered by the currently selected network
3. **Independent Management**: Each token is managed independently:
   - Supply on one network doesn't affect supply on others
   - Actions (mint, burn, transfer) are network-specific

### Contract Interaction

Interacting with your token once deployed:

1. **Minting**: Select your token and use the "Mint" function
2. **Burning**: Select your token and use the "Burn" function  
3. **Transferring**: Select your token and use the "Transfer" function

**Note**: All actions require transaction approval and gas fees in the native token of the selected network.

### Best Practices

1. **Test First**: Deploy to testnets before mainnet networks
2. **Document Deployments**: Keep a record of all deployments and their parameters
3. **Secure Your Wallet**: As the token owner, secure your deployment wallet carefully
4. **Consider Gas Costs**: Different networks have vastly different gas costs
5. **Monitor Activity**: Regularly check your tokens across all networks

### Troubleshooting

| Issue | Possible Solution |
|-------|-------------------|
| Failed deployment | Check wallet balance for gas fees |
| Network unavailable | Verify RPC endpoint is correct and responsive |
| Wallet won't switch networks | Add the network manually in your wallet |
| Token not showing after switch | Click refresh or wait 15-30 seconds |
| Incorrect token data | Verify you're on the expected network |

By following this guide, you'll be able to effectively deploy and manage your tokens across multiple blockchain networks using QuickToken.

## 🚀 Deploying Your QuickToken Dashboard

This guide outlines the steps to deploy your customized QuickToken dashboard application to a hosting provider like Vercel or Netlify.

**Crucial Prerequisite:** You MUST complete the local setup and configuration wizard *before* deploying to a hosting provider. The configuration file generated locally needs to be included in the code you deploy.

### Phase 1: Local Setup & Configuration

1.  **Install Dependencies:**
    *   Ensure you have Node.js (v18 or later recommended) and npm installed.
    *   Navigate to the project root directory in your terminal.
    *   Run `npm install` to install all dependencies for Hardhat and the Next.js dashboard.

2.  **Run Local Development Server:**
    *   Run `npm run dev` in the project root. This starts the Next.js development server (usually on `http://localhost:3000`).

3.  **Complete Setup Wizard:**
    *   Open your browser to the local development server (e.g., `http://localhost:3000`).
    *   You should be greeted by the setup wizard.
    *   Follow the on-screen instructions to configure:
        *   Branding (Title, etc.)
        *   Platform fees
        *   Supported networks and their RPC URLs
        *   Wallet connections (MetaMask, Coinbase)
        *   Initial whitelist/admin addresses
    *   **Important:** This process generates or updates the configuration file located at `public/dashboard-config.json` in your project's root directory.

4.  **Verify Configuration File:**
    *   After completing the wizard, check the `public/dashboard-config.json` file. Ensure it reflects the settings you chose.

5.  **(Optional) Local Contract Deployment:**
    *   If you want to test deployment locally before configuring for production:
        *   Start a local Hardhat node: `npm run node` (in a separate terminal).
        *   Deploy contracts: `npm run deploy:local`.
        *   Use the dashboard on `localhost:3000` to interact with these local contracts.

### Phase 2: Prepare for Deployment

1.  **Commit Configuration File:**
    *   **This is the most critical step for deployment.** The `public/dashboard-config.json` file containing your unique setup **must** be committed to your Git repository.
    *   Stage the file: `git add public/dashboard-config.json`
    *   Commit the file: `git commit -m "feat: Add dashboard configuration"`
    *   If you made other code changes, stage and commit them as well (`git add .` followed by `git commit -m "Your commit message"`).

2.  **Push to Git:**
    *   Push your commit(s) to the Git repository connected to your hosting provider (e.g., GitHub, GitLab).
    *   `git push origin <your-branch-name>` (e.g., `git push origin main`)

### Phase 3: Deploy to Hosting Provider (Vercel Example)

1.  **Connect Git Repository:**
    *   Log in to your Vercel account.
    *   Create a new project and import the Git repository containing your QuickToken dashboard code.

2.  **Configure Project Settings:**
    *   Vercel should automatically detect it as a **Next.js** project.
    *   **Framework Preset:** Ensure "Next.js" is selected.
    *   **Root Directory:** Leave this as the default (`.`). Vercel will build from the repository root.
    *   **Build & Output Settings:** Vercel's defaults for Next.js (`npm run build`, output dir `.next`) should work correctly. You typically don't need to change these.

3.  **Set Environment Variables:**
    *   Go to your project's `Settings` -> `Environment Variables`.
    *   **Add `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`:**
        *   **Why?** Even if you primarily use MetaMask/Coinbase buttons, the underlying wallet connection libraries (like Web3Modal) often require a WalletConnect Project ID to function correctly, especially for mobile wallet connections via QR codes.
        *   **How?**
            *   Go to [WalletConnect Cloud](https://cloud.walletconnect.com/).
            *   Create a new project (it's free).
            *   Copy the generated Project ID.
            *   In Vercel, add the variable `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` and paste your Project ID as the value.
            *   Ensure it's available for the "Production" environment (and others if needed).

4.  **Deploy:**
    *   Click the "Deploy" button.
    *   Vercel will pull the latest code (including your committed `dashboard-config.json`), build the Next.js application, and deploy it.

5.  **Access Your Dashboard:**
    *   Once deployed, use the URL provided by Vercel to access your live QuickToken dashboard, pre-configured with the settings from `dashboard-config.json`.

### Netlify Deployment Notes

The process for Netlify is similar:

1.  Connect your Git repository.
2.  Netlify should detect Next.js.
3.  **Build Command:** `npm run build`
4.  **Publish Directory:** `.next`
5.  **Environment Variables:** Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in Site settings -> Build & deploy -> Environment.

### Important Considerations

*   **Configuration Updates:** If you need to change the dashboard configuration later, run the wizard locally (`npm run dev`), update `public/dashboard-config.json`, commit the change, and push to Git. Vercel/Netlify will automatically redeploy with the new configuration.
*   **Security:** The `dashboard-config.json` file is public. Do **not** store private keys or other sensitive secrets in this file. Configuration like platform fee addresses, branding, and network RPCs are generally safe for public exposure. Whitelist addresses are also typically public on-chain.
*   **RPC URLs:** Ensure the RPC URLs configured in the wizard (and saved in `dashboard-config.json`) are reliable endpoints suitable for production use (e.g., Infura, Alchemy, or your own node). Avoid using keys directly in the URL if possible; some services allow domain-restricted keys.

By following these steps, buyers can successfully deploy their personalized QuickToken dashboard instance. 