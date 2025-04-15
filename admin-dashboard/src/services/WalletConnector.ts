import { ethers } from 'ethers';

// --- EIP-6963 Types ---
// See: https://eips.ethereum.org/EIPS/eip-6963

// Interface for the EIP-1193 provider object
export interface EIP1193Provider {
  isStatus?: boolean;
  host?: string;
  path?: string;
  sendAsync?: (request: { method: string, params?: Array<unknown> }, callback: (error: Error | null, response: unknown) => void) => void;
  send?: (request: { method: string, params?: Array<unknown> }, callback: (error: Error | null, response: unknown) => void) => void;
  request: (request: { method: string, params?: Array<unknown> }) => Promise<unknown>;
  // Add optional event handling methods
  on?(eventName: string | symbol, listener: (...args: any[]) => void): this;
  removeListener?(eventName: string | symbol, listener: (...args: any[]) => void): this;
}

// Interface for the EIP-6963 provider information
// Export this interface
export interface EIP6963ProviderInfo {
  uuid: string;       // Unique identifier for the provider instance
  name: string;       // Human-readable name of the wallet
  icon: string;       // Data URL of the wallet's icon
  rdns: string;       // Reverse DNS name identifier for the wallet brand (e.g., "io.metamask")
}

// Interface for the detail object received in the announce event
// Export this interface
export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
}

// Interface for the announce event
// interface EIP6963AnnounceProviderEvent extends CustomEvent {
//   type: 'eip6963:announceProvider';
//   detail: EIP6963ProviderDetail;
// }

// Type for the request event (no detail needed)
// interface EIP6963RequestProviderEvent extends Event {
//   type: 'eip6963:requestProvider';
// }

// --- End EIP-6963 Types ---


// Keep WalletType for potential internal logic or UI hints if needed, but connection relies on RDNS now

// Result structure remains similar, but provider is now more specific
interface ConnectResult {
  provider: ethers.BrowserProvider | null;
  account: string | null;
  chainId: number | null;
  error?: string;
  // Add info about the connected wallet if available
  walletInfo?: EIP6963ProviderInfo; 
}

export class WalletConnector {
  private static instance: WalletConnector;
  
  // Store discovered providers mapped by their RDNS
  private discoveredProviders: Map<string, EIP6963ProviderDetail> = new Map();
  private discoveryComplete: boolean = false;
  private discoveryTimeout: NodeJS.Timeout | null = null;

  // Store the details of the *actively connected* provider
  private activeProviderDetail: EIP6963ProviderDetail | null = null;
  private activeEthersProvider: ethers.BrowserProvider | null = null;
  private lastKnownAccount: string | null = null;
  private lastKnownChainId: number | null = null;
  private isNetworkChanging: boolean = false; // Keep for handling network change events

  // --- Listener Management ---
  // Store bound listeners to ensure proper removal
  private _boundChainChangedHandler: ((chainId: string) => void) | null = null;
  private _boundAccountsChangedHandler: ((accounts: string[]) => void) | null = null;
  private _boundDisconnectHandler: (() => void) | null = null;

  private constructor() {
    // Start discovery immediately
    this.discoverAvailableProviders();
  }

  public static getInstance(): WalletConnector {
    if (!WalletConnector.instance) {
      WalletConnector.instance = new WalletConnector();
    }
    return WalletConnector.instance;
  }

  // --- EIP-6963 Discovery Logic ---

  /**
   * Dispatches the request event and sets up the listener for announcements.
   */
  public discoverAvailableProviders(): void {
    if (typeof window === 'undefined') return; // Guard for SSR or non-browser envs

    this.discoveredProviders.clear();
    this.discoveryComplete = false;

    const handleAnnounce = (event: Event) => {
      // Type assertion is necessary as CustomEvent might not be globally defined well
      const announceEvent = event as CustomEvent<EIP6963ProviderDetail>;
      if (announceEvent.type === 'eip6963:announceProvider' && announceEvent.detail) {
        const detail = announceEvent.detail;
        // Use RDNS as the unique key
        if (detail.info?.rdns && !this.discoveredProviders.has(detail.info.rdns)) {
          this.discoveredProviders.set(detail.info.rdns, detail);
          // Optionally, notify listeners that providers have updated
          window.dispatchEvent(new CustomEvent('walletProvidersUpdated'));
        }
      }
    };

    // Listen for announcements
    window.addEventListener('eip6963:announceProvider', handleAnnounce);

    // Dispatch the request event
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    // Set a timeout to consider discovery "complete" after a short period
    // Wallets should announce themselves quickly
    if (this.discoveryTimeout) clearTimeout(this.discoveryTimeout);
    this.discoveryTimeout = setTimeout(() => {
      this.discoveryComplete = true;
      // Stop listening after timeout? Or keep listening for late announcements? Keep listening for now.
      // window.removeEventListener('eip6963:announceProvider', handleAnnounce); // Consider cleanup strategy
    }, 1000); // Wait 1 second for announcements
  }

  /**
   * Returns the map of discovered providers.
   */
  public getDiscoveredProviders(): Map<string, EIP6963ProviderDetail> {
    // If discovery isn't complete, maybe wait briefly or return current state?
    // For now, return the current map. Components might need to listen for updates.
    return this.discoveredProviders;
  }

  /**
   * Checks if the initial EIP-6963 discovery period has ended.
   */
  public isDiscoveryComplete(): boolean {
    return this.discoveryComplete;
  }

  // --- Event Listener Management ---

  private setupEventListeners(provider: EIP1193Provider | null) {
    this.removeEventListeners(); // Clear previous listeners first
    if (!provider) return;

    this._boundChainChangedHandler = this.handleChainChanged.bind(this);
    this._boundAccountsChangedHandler = this.handleAccountsChanged.bind(this);
    // EIP-1193 recommends listening for 'disconnect' as well
    this._boundDisconnectHandler = this.handleDisconnectEvent.bind(this); 

    provider.on?.('chainChanged', this._boundChainChangedHandler);
    provider.on?.('accountsChanged', this._boundAccountsChangedHandler);
    provider.on?.('disconnect', this._boundDisconnectHandler); // Listen for disconnect

    // console.log(`[WalletConnector] Event listeners set up for provider: ${this.activeProviderDetail?.info.name}`);
  }

  private removeEventListeners() {
    const provider = this.activeProviderDetail?.provider;
    if (!provider) return;

    if (this._boundChainChangedHandler) {
      provider.removeListener?.('chainChanged', this._boundChainChangedHandler);
      this._boundChainChangedHandler = null;
    }
    if (this._boundAccountsChangedHandler) {
      provider.removeListener?.('accountsChanged', this._boundAccountsChangedHandler);
      this._boundAccountsChangedHandler = null;
    }
    if (this._boundDisconnectHandler) {
      provider.removeListener?.('disconnect', this._boundDisconnectHandler);
      this._boundDisconnectHandler = null;
    }
     // console.log(`[WalletConnector] Event listeners removed for provider: ${this.activeProviderDetail?.info.name}`);
  }

  // --- Event Handlers ---

  private handleChainChanged(chainId: string) {
    this.isNetworkChanging = true; // Flag network change
    try {
      this.lastKnownChainId = parseInt(chainId, 16);
    } catch (e) {
       console.error("[WalletConnector] Error parsing chainId:", chainId, e);
       this.lastKnownChainId = null; // Set to null if parsing fails
    }
    
    // Reset flag after delay
    setTimeout(() => {
      this.isNetworkChanging = false;
    }, 1500); // Slightly longer delay
  }

  private handleAccountsChanged(accounts: string[]) {
    if (accounts.length === 0) {
      // Handle disconnection or lock
       console.log('[WalletConnector] Wallet locked or disconnected (accounts empty).');
      // Call internal disconnect logic to clear state
      this.handleDisconnectEvent(); 
    } else {
      // Update account if it changed
      if (accounts[0] !== this.lastKnownAccount) {
         console.log(`[WalletConnector] Account changed to: ${accounts[0]}`);
        this.lastKnownAccount = accounts[0].toLowerCase(); // Normalize address
      }
    }
  }
  
  // Handler for the EIP-1193 'disconnect' event
  private handleDisconnectEvent() {
     console.log(`[WalletConnector] Received 'disconnect' event from provider: ${this.activeProviderDetail?.info.name}`);
     this.disconnect(false); // Call internal disconnect, false means don't remove listeners yet (they are auto-removed by EIP-1193?)
  }


  // --- Connection Logic ---

  /**
   * Connect to a specific provider identified by its RDNS.
   */
  public async connect(rdns: string): Promise<ConnectResult> {
     console.log(`[WalletConnector] Attempting to connect using RDNS: ${rdns}`);
    // Ensure discovery has run (or wait for it?) - for now, assume it has run
    if (!this.discoveryComplete && this.discoveredProviders.size === 0) {
       console.warn("[WalletConnector] Connect called before discovery finished or found providers.");
       // Optionally wait or trigger discovery again here
    }

    const providerDetail = this.discoveredProviders.get(rdns);

    if (!providerDetail) {
       console.error(`[WalletConnector] Provider with RDNS '${rdns}' not found.`);
      return { provider: null, account: null, chainId: null, error: `Wallet (${rdns}) not found or available.` };
    }

    // Disconnect any previous connection first
    this.disconnect(); 
    await new Promise(resolve => setTimeout(resolve, 100)); // Short delay after disconnect

    this.activeProviderDetail = providerDetail;
    const targetProvider = providerDetail.provider;

    try {
      this.activeEthersProvider = new ethers.BrowserProvider(targetProvider, 'any'); // Use specific provider, 'any' allows auto network detection
       console.log(`[WalletConnector] Created ethers BrowserProvider for ${providerDetail.info.name}`);
      
      // Request accounts - this should trigger the wallet connect prompt
       console.log(`[WalletConnector] Requesting accounts ('eth_requestAccounts') from ${providerDetail.info.name}...`);
      const accounts = await targetProvider.request({ method: 'eth_requestAccounts' }) as string[];
       console.log(`[WalletConnector] Received accounts:`, accounts);

      if (!accounts || accounts.length === 0) {
        this.disconnect(); // Ensure cleanup if connection fails
        return { provider: null, account: null, chainId: null, error: 'No accounts returned. Please ensure your wallet is unlocked and grant permission.' };
      }

      this.lastKnownAccount = accounts[0].toLowerCase(); // Normalize
      
      // Get chain ID
       console.log(`[WalletConnector] Requesting chain ID ('eth_chainId') from ${providerDetail.info.name}...`);
      const chainIdHex = await targetProvider.request({ method: 'eth_chainId' }) as string;
      this.lastKnownChainId = parseInt(chainIdHex, 16);
       console.log(`[WalletConnector] Received chain ID: ${this.lastKnownChainId} (Hex: ${chainIdHex})`);

      // Setup event listeners for the *active* provider
      this.setupEventListeners(targetProvider);

       console.log(`[WalletConnector] Connection successful to ${providerDetail.info.name}, Account: ${this.lastKnownAccount}, ChainID: ${this.lastKnownChainId}`);
      return {
        provider: this.activeEthersProvider,
        account: this.lastKnownAccount,
        chainId: this.lastKnownChainId,
        walletInfo: providerDetail.info, // Include wallet info
      };

    } catch (error: any) {
      console.error(`[WalletConnector] Connection error during connect to ${providerDetail?.info?.name || rdns}:`, error);
      this.disconnect(); // Ensure cleanup on error
      let errorMessage = 'Failed to connect wallet.';
      if (error.message) {
         // Basic error handling improvement
        if (error.message.includes('User rejected') || error.code === 4001 || error.message.includes('User denied')) {
          errorMessage = 'Connection request rejected. Please try again and approve the request.';
        } else if (error.message.includes('disconnected')) {
          errorMessage = 'Wallet disconnected during connection.';
        } else {
           errorMessage = error.message; // Use original message if specific pattern not found
        }
      }
      return { provider: null, account: null, chainId: null, error: errorMessage };
    }
  }

  /**
   * Disconnects the wallet connection state within the connector.
   * Note: This doesn't necessarily disconnect the wallet extension itself.
   */
  public disconnect(removeListeners = true): void {
    console.log(`[WalletConnector] disconnect called. Active provider: ${this.activeProviderDetail?.info.name}`);
    if (removeListeners) {
       this.removeEventListeners();
    }
    this.activeProviderDetail = null;
    this.activeEthersProvider = null;
    this.lastKnownAccount = null;
    this.lastKnownChainId = null;
    this.isNetworkChanging = false;
    // Do NOT clear discoveredProviders here, discovery runs once on init
    console.log('[WalletConnector] Internal state cleared.');
     // Optionally notify listeners about disconnection
     window.dispatchEvent(new CustomEvent('walletDisconnected'));
  }

  /**
   * Get the current connection state based on the *active* provider.
   */
  public async getConnectionState(): Promise<ConnectResult> {
    const logPrefix = "[WalletConnector.getConnectionState]";
    
    // If no provider is stored as active, we are disconnected
    if (!this.activeProviderDetail || !this.activeEthersProvider) {
      console.log(`${logPrefix} No active provider detail stored. Returning disconnected state.`);
      return { provider: null, account: null, chainId: null };
    }

    const targetProvider = this.activeProviderDetail.provider;
    const providerName = this.activeProviderDetail.info.name;
    console.log(`${logPrefix} Checking state for active provider: ${providerName}`);

    try {
      // Use eth_accounts to check without triggering prompts
      console.log(`${logPrefix} Requesting 'eth_accounts' from ${providerName}...`);
      const accounts = await targetProvider.request({ method: 'eth_accounts' }) as string[];
      console.log(`${logPrefix} Received accounts:`, accounts);

      const currentAccount = accounts && accounts.length > 0 ? accounts[0].toLowerCase() : null; // Normalize

      // If no account, wallet is locked or disconnected from dapp perspective
      if (!currentAccount) {
        console.log(`${logPrefix} No accounts returned from ${providerName}. Wallet locked or disconnected.`);
        // If state changed to disconnected, trigger internal cleanup
        if (this.lastKnownAccount !== null) {
            this.disconnect(); // Clear all state if we transition to disconnected
        }
        return { provider: null, account: null, chainId: null };
      }
      
      // Update internal account if necessary
      if (currentAccount !== this.lastKnownAccount) {
         console.log(`${logPrefix} Account updated: ${currentAccount}`);
         this.lastKnownAccount = currentAccount;
      }

      // Get current chain ID
      console.log(`${logPrefix} Requesting 'eth_chainId' from ${providerName}...`);
      const chainIdHex = await targetProvider.request({ method: 'eth_chainId' }) as string;
      const currentChainId = parseInt(chainIdHex, 16);
       console.log(`${logPrefix} Received chainId: ${currentChainId} (Hex: ${chainIdHex})`);

      if (currentChainId !== this.lastKnownChainId) {
         console.log(`${logPrefix} Chain ID updated: ${currentChainId}`);
         this.lastKnownChainId = currentChainId;
      }
      
      // Return current valid state
      // ** Add final check before accessing activeProviderDetail **
      if (!this.activeProviderDetail) {
        console.log(`${logPrefix} Active provider became null during execution. Returning disconnected state.`);
        return { provider: null, account: null, chainId: null };
      }

      const finalResult: ConnectResult = {
        provider: this.activeEthersProvider,
        account: this.lastKnownAccount,
        chainId: this.lastKnownChainId,
        walletInfo: this.activeProviderDetail.info, 
      };
      console.log(`${logPrefix} Returning final state:`, finalResult);
      return finalResult;

    } catch (error) {
      console.error(`${logPrefix} Error getting connection state for ${providerName}:`, error);
      // If error occurs checking state, assume disconnected
      this.disconnect();
      return { provider: null, account: null, chainId: null, error: `Error checking wallet state.` };
    }
  }

  // --- Utility Methods ---

  /**
   * Get the info of the currently connected wallet.
   */
  public getActiveWalletInfo(): EIP6963ProviderInfo | null {
    return this.activeProviderDetail?.info ?? null;
  }
  
  /**
   * Check if network is currently changing (based on event flag).
   */
  public isNetworkSwitching(): boolean {
    return this.isNetworkChanging;
  }

  /**
   * Returns the details of the currently active provider connection.
   */
  public getActiveProviderDetail(): EIP6963ProviderDetail | null {
    return this.activeProviderDetail;
  }

  // --- Deprecated/Legacy Methods (Optional: Decide if needed or remove) ---
  /*
  public getWalletType(): WalletType | null {
    // This is less reliable now, use getActiveWalletInfo().rdns or name
    if (!this.activeProviderDetail) return null;
    const rdns = this.activeProviderDetail.info.rdns;
    if (rdns.startsWith('io.metamask')) return 'metamask';
    if (rdns.startsWith('com.coinbase')) return 'coinbase';
    // Add more mappings if needed for wallet-connect or others based on RDNS
    return 'other';
  }
  */

}

export default WalletConnector.getInstance(); 