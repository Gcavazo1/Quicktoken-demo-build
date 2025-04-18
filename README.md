# 💸 QuickToken Dashboard & ERC-20 Toolkit

**A streamlined, self-hosted solution for launching and managing your own ERC-20 tokens.** Perfect for creators, developers, and businesses wanting full control over their token deployment process.

---

## 🔥 Features

*   ✅ **Production-Ready Smart Contract:** Secure and gas-efficient `QuickToken.sol` based on OpenZeppelin standards (ERC20, Ownable, Pausable).
*   ✅ **Self-Hosted Admin Dashboard:** User-friendly React interface (built with Next.js & Tailwind CSS) for deploying tokens and managing settings without needing complex scripts.
*   ✅ **Wallet Integration:** Connects easily with MetaMask and Coinbase Wallet using Wagmi.
*   ✅ **Setup Wizard:** Simple step-by-step process to configure your dashboard settings locally.
*   ✅ **Whitelist Security:** Restrict administrative functions to specific owner/admin wallet addresses.
*   ✅ **Settings Management:** Update dashboard configuration (fees, networks, whitelist) post-deployment via a dedicated Settings page.
*   ✅ **Configurable Fees:** Set platform fees and minting fees for your tokens.
*   ✅ **Pausable Tokens:** Owner can pause/unpause token transfers for security.
*   ✅ **Customizable:** Modular code structure allows for easier customization and integration.
*   **(Optional) Hardhat Scripts:** Includes scripts for advanced users who prefer command-line contract deployment and verification.

---

## 🧑‍💼 Who Is This For?

*   Indie developers and entrepreneurs.
*   Freelancers deploying tokens for clients.
*   Creators launching community or utility tokens.
*   Anyone needing a ready-to-use, self-hosted token deployment platform.

---

## 🧱 Tech Stack

| Layer             | Technology                                   |
| ----------------- | -------------------------------------------- |
| Smart Contracts   | Solidity, OpenZeppelin                       |
| Admin Dashboard   | Next.js (React), Tailwind CSS, Wagmi, Ethers |
| Deployment        | Vercel (Recommended), Netlify, Static Export |
| (Optional) Scripts| Node.js, Hardhat                             |

---

## 🚀 Getting Started: From Zero to Deployed Dashboard

Follow these steps carefully to set up and deploy your QuickToken dashboard.

**Prerequisites:**

*   **Node.js:** Version 18.x or later recommended.
*   **npm** or **yarn:** Package manager for Node.js.
*   **Git:** For cloning the repository and deploying via Vercel.
*   **Code Editor:** Like VS Code.
*   **Web3 Wallet:** MetaMask or Coinbase Wallet browser extension for interacting with the dashboard.

**Setup Steps:**

1.  **Clone the Repository:**
    ```bash
    git clone [your-repo-url] # Replace with the URL you received
    cd [repository-folder]
    ```

2.  **Install Dependencies:**
    Install dependencies for both the root project (Hardhat scripts) and the admin dashboard.
    ```bash
    # Install root dependencies
    npm install

    # Install dashboard dependencies
    cd admin-dashboard
    npm install
    cd .. # Go back to the root directory
    ```

3.  **Compile Smart Contracts:**
    This step compiles the `QuickToken.sol` contract and generates necessary files (artifacts) used by the dashboard.
    ```bash
    npm run build:contract
    ```

4.  **Environment Variables (`.env`) - Optional for UI Deployment:**
    *   This project includes optional Hardhat scripts (`/scripts`) for command-line deployment and verification. **If you plan to use these scripts**, copy `.env.example` to `.env` in the project root and fill in your `RPC_URL`s, `PRIVATE_KEY`, and `ETHERSCAN_API_KEY`.
    *   **Important:** For the standard setup using the Admin Dashboard UI, **you do not need to configure the `.env` file.** The dashboard connects directly to the user's wallet (MetaMask/Coinbase) for deployments.

5.  **Initial Local Setup (Setup Wizard - CRITICAL STEP):**
    *   **Why?** You *must* run the Setup Wizard locally first to configure essential settings like your platform fee address, desired networks, and the **Owner Wallet address** for security.
    *   **How:**
        ```bash
        cd admin-dashboard
        npm run dev
        ```
        Open your browser to `http://localhost:3000` (or the port indicated).
    *   **(If Re-running Wizard):** If you previously completed the setup locally and want to start over, you might need to **delete the `public/dashboard-config.json` file** (if it exists) and **clear your browser's local storage** for `localhost:3000` before running `npm run dev` again.
    *   **Follow the Wizard:** Complete all steps:
        *   **Platform Settings:** Set your fee address and percentage.
        *   **Wallet Options:** Choose supported wallets (MetaMask/Coinbase).
        *   **Branding:** Set your dashboard title and theme.
        *   **Network Settings:** Configure the blockchain networks (e.g., Ethereum, Polygon, Sepolia) you want to enable for token deployment. Add RPC URLs and Explorer URLs.
        *   **Admin Access (Whitelist):** Define the primary **Owner** address (usually your connected wallet) and optionally add other **Admin** addresses. See `docs/WHITELIST_IMPLEMENTATION.md` for details.
        *   **Verify & Export:**
            *   Connect with your designated **Owner** wallet to verify.
            *   **CRITICAL:** Click **"Export Configuration"** and **download the `dashboard-config.json` file.**

6.  **Add Config File to Project:**
    *   Take the `dashboard-config.json` file you just downloaded.
    *   Place it inside the `/public` directory at the **root** of your project.
    *   The final path must be: `[your-project-root]/public/dashboard-config.json`.

7.  **Commit Changes to Git:**
    *   Make sure you've added the `public/dashboard-config.json` file.
    ```bash
    git add public/dashboard-config.json
    git commit -m "Add initial dashboard configuration"
    # Also commit any other changes you made
    git add .
    git commit -m "Complete initial setup"
    # Push to your Git repository (e.g., GitHub, GitLab)
    git push origin main
    ```

8.  **Deploy to Vercel (Recommended):**
    *   **Why Vercel?** It offers easy, continuous deployment directly from your Git repository and handles Next.js projects seamlessly.
    *   **Steps:**
        1.  Sign up or log in to [Vercel](https://vercel.com/).
        2.  Click "Add New..." > "Project".
        3.  Import the Git repository you just pushed to.
        4.  Vercel should automatically detect it as a Next.js project.
        5.  Configure the **Root Directory** setting to be `admin-dashboard`.
        6.  **Environment Variables:**
            *   You **MUST** add an environment variable named `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`.
            *   Obtain your Project ID from [WalletConnect Cloud](https://cloud.walletconnect.com/).
            *   This ID is necessary for the dashboard to connect with various wallets, especially mobile ones.
        7.  Click "Deploy".
    *   Vercel will build and deploy your dashboard. Any future pushes to your connected Git branch will automatically trigger redeployments.

9.  **Verify Deployment:**
    *   Access the URL provided by Vercel.
    *   You should see your configured dashboard, **not** the Setup Wizard.
    *   Connect your wallet and test functionality.

---

## 🔧 Post-Deployment Management (Settings Page)

After initial deployment, you can manage most dashboard settings directly from the deployed application:

1.  Navigate to the `/settings` page on your deployed dashboard URL.
2.  **Connect with the Owner Wallet:** Only the wallet address designated as **Owner** during setup can access and modify these settings.
3.  Make changes to Platform Fees, Networks, Whitelist, etc.
4.  **Export & Redeploy:**
    *   After making changes, click **"Export Configuration"** on the Settings page.
    *   Download the **new** `dashboard-config.json` file.
    *   **Replace** the existing `public/dashboard-config.json` in your local project folder with the newly downloaded one.
    *   **Commit** the updated file to your Git repository.
    *   **Push** the changes to Git.
    *   Vercel (or your hosting provider) will automatically redeploy your dashboard with the updated configuration.

---

## 🛡️ Whitelist & Permissions

This dashboard uses a whitelist to control access to administrative functions. Only addresses designated as 'Owner' or 'Admin' can modify settings or perform certain actions. Please read the dedicated guide for a full explanation:

*   `docs/WHITELIST_IMPLEMENTATION.md`

---

## 📝 Key Contract Features (`QuickToken.sol`)

*   **Standard ERC-20:** Implements `transfer`, `approve`, `balanceOf`, etc.
*   **Ownable:** Contract deployment address is the owner with special privileges.
*   **Pausable:** Owner can pause/unpause token transfers.
*   **Minting:** Only the owner can mint new tokens after deployment. A minting fee (configurable percentage via the dashboard) is sent to the platform fee address in ETH (`msg.value`) with each mint.
*   **Burning:** Any token holder can burn their own tokens.
*   **Unlock Time:** A configurable timestamp after which minting is allowed.

---

## 🛠️ (Optional) Hardhat Scripts

For advanced users, the project includes Hardhat scripts in the `/scripts` directory for:

*   `deploy.js`: Command-line contract deployment.
*   `verify.js`: Contract verification on Etherscan-like explorers.

Using these scripts requires configuring the `.env` file as mentioned in Step 4.
