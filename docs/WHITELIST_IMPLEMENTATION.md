# QuickToken Dashboard - Whitelist & Permissions Guide

## 1. Overview: What is the Whitelist?

The QuickToken Dashboard includes a security feature called the **Whitelist**. This system controls which specific Ethereum wallet addresses have administrative privileges to manage your dashboard and perform sensitive actions.

Think of it like setting administrators for a website. Only users connecting with a wallet address listed on the whitelist can access certain features, protecting your dashboard configuration and settings from unauthorized changes.

## 2. Why is the Whitelist Important?

Without a whitelist, *any* user connecting their wallet to your dashboard could potentially:

*   Modify critical settings like the **Platform Fee Address** (where your fees are collected).
*   (During local development) Access the **Reset Wizard** button, which could wipe out your configuration.

By configuring the whitelist, you ensure that only trusted addresses can perform these administrative actions.

## 3. Permission Levels

The whitelist system defines three levels of access:

*   **Owner (You):**
    *   Set up during the initial Setup Wizard.
    *   Has **full control** over all dashboard settings and features.
    *   Can add or remove other **Admin** addresses via the **Settings** page.
    *   Is the only address that can manage the whitelist itself.
    *   Has exclusive access to the **Reset Wizard** button (primarily used during local development).
*   **Admin (Whitelisted):**
    *   Addresses you explicitly add to the whitelist via the Settings page.
    *   Can modify platform settings (like the fee address) and manage token deployments.
    *   **Cannot** manage the whitelist (add/remove other admins or change the owner).
    *   **Cannot** access the Reset Wizard button.
*   **Regular User (Not Whitelisted):**
    *   Any user connecting with a wallet address **not** on the whitelist.
    *   Can view dashboard information and deployed tokens.
    *   Can connect their wallet.
    *   **Cannot** modify platform settings (fields like Platform Fee Address will appear read-only).
    *   **Cannot** manage the whitelist.
    *   **Cannot** access the Reset Wizard button.

## 4. Initial Setup (Setup Wizard - Step 6)

You configure the initial whitelist during the Setup Wizard:

1.  **Owner Address:** The wallet address you are connected with during the setup is automatically designated as the primary **Owner**.
2.  **Adding Admins (Optional):** You can add other wallet addresses as **Admins** during this step.

It is crucial to ensure you add at least your primary wallet as the Owner.

## 5. Managing the Whitelist After Setup (Settings Page)

After completing the Setup Wizard, the **Owner** can manage the whitelist via the **Settings** page of the deployed dashboard:

*   **Adding Admins:** Enter the wallet address and an optional label for a new Admin.
*   **Removing Admins:** Remove existing Admin addresses.
*   **Viewing:** See the list of current Owner and Admin addresses.

**Important:** Only the designated **Owner** address can access the whitelist management section within the Settings page.

## 6. Security Considerations (Client-Side Storage)

The whitelist configuration is primarily stored in your browser's **localStorage**. This means:

*   **Persistence:** The whitelist persists between browser sessions *on that specific computer and browser profile*.
*   **Clearing Cache:** If you clear your browser's cache and site data, the whitelist stored in localStorage will be erased. However, if you have deployed the `dashboard-config.json` file, the dashboard will automatically re-seed the whitelist from that file upon the next load.
*   **Manual Modification:** A technically savvy user *could* potentially modify the whitelist stored in their own browser's localStorage. However, this only affects *their* view and permissions. They cannot change the authoritative configuration deployed in `public/dashboard-config.json` without accessing your codebase and redeploying.

**Best Practice:** Always rely on the deployed `public/dashboard-config.json` as the source of truth for your production environment. Use the **Settings** page (as the Owner) to manage the whitelist and export the updated `dashboard-config.json` file for deployment.

## 7. Troubleshooting

*   **Locked out / Cannot Access Admin Features:** Ensure you are connected with the correct Owner or an Admin wallet address listed on the whitelist.
*   **Whitelist Changes Not Reflected:** If you manually edited `localStorage`, refresh the page. If you updated `dashboard-config.json`, ensure you have redeployed the application.

By understanding and utilizing the whitelist, you can maintain a secure and properly administered QuickToken dashboard.