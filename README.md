# 💸 QuickToken Template — Commercial ERC-20 Starter Kit

**A streamlined, self-hosted ERC-20 token deployment toolkit** for creators, devs, and builders looking to launch and manage their own tokens with ease.

---

## 🔥 What's Included

- ✅ Production-ready ERC-20 Smart Contract (OpenZeppelin-based)
- ✅ Simple Deploy Script (Node/Hardhat-based)
- ✅ Self-Hosted Admin Dashboard (React + Wagmi)
- ✅ Modular Code for Customization
- ✅ Easy to extend or integrate into your own stack

---

## 🧑‍💼 Who This Is For

- Indie devs building passive income projects
- Freelancers deploying tokens for clients
- Creators launching community tokens
- Builders who want a plug-and-play token deployer

---

## 🧱 Tech Stack

| Layer             | Tech                                              |
| ----------------- | ------------------------------------------------- |
| Smart Contracts   | Solidity, OpenZeppelin                            |
| Script Automation | Node.js, Hardhat                                  |
| Admin Dashboard   | React, Tailwind, Wagmi (WalletConnect + MetaMask) |
| Landing Page      | Next.js or Vite (React-based), TailwindCSS        |
| Hosting           | Vercel, Netlify, or Static Export                 |
| Optional Backend  | Supabase (for tracking deployed tokens)           |

---

## 📦 Contents

---

## 📝 Key Contract Features (QuickToken.sol)

- **Standard ERC-20:** Implements `transfer`, `approve`, `balanceOf`, etc.
- **Ownable:** Contract deployment address is the owner with special privileges.
- **Pausable:** Owner can pause/unpause token transfers (useful for emergencies).
- **Minting:** 
    - Only the owner can mint new tokens.
    - A minting fee (configurable percentage in basis points) is sent to the owner's wallet in ETH (`msg.value`) with each mint.
- **Burning:**
    - **Any token holder can burn their own tokens** using the `burn(amount)` function.
    - The `burnFrom(account, amount)` function allows an approved spender (like a DEX or another contract) to burn tokens from an account's allowance.
- **Fee Distribution:** (Note: The contract calculates fees, but actual distribution logic might be off-chain or in extending contracts).
- **Unlock Time:** A configurable time after deployment before certain actions might be enabled (implementation details may vary).

---

## 🚀 Getting Started

1.  **Clone the repo:** `git clone [your-repo-url]`
2.  **Install dependencies:**
    - Root: `npm install`
    - Dashboard: `cd admin-dashboard && npm install`
3.  **Configure Environment (Optional but Recommended for Scripts):**
    - Copy `config/.env.example` to `.env` in the project root.
    - Fill in `RPC_URL`s, `PRIVATE_KEY`, and API keys (`ETHERSCAN_API_KEY`, etc.) in `.env` if you plan to use Hardhat scripts for deployment/verification on testnets/mainnet.
    - **Note:** The Admin Dashboard uses wallet connections (MetaMask/WalletConnect) and UI forms for deployment parameters. The `.env` file is primarily used by the Hardhat configuration (`hardhat.config.js`) and scripts in the `/scripts` directory (e.g., `deploy.js`, `verify.js`) for CLI-based operations.
4.  **Compile Contracts:** `npm run build:contract` (This also generates the frontend artifact)
5.  **Run Locally:**
    - Start Hardhat Node: `npx hardhat node` (in one terminal)
    - Deploy to Hardhat Node: `npx hardhat run scripts/deploy.js --network localhost` (in another terminal)
    - Start Dashboard: `cd admin-dashboard && npm run dev`
