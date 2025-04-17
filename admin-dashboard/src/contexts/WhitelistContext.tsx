import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useWallet } from '../hooks/useWallet';

/**
 * Types for whitelist entries and configuration
 */
export interface WhitelistEntry {
  address: string;
  label: string;
  addedAt: number;
  permissions: string[]; // Can include 'owner', 'admin', etc.
}

export interface WhitelistConfig {
  entries: WhitelistEntry[];
  ownerAddress: string; // For backward compatibility, we keep the primary owner
  lastModified: number;
  whitelistEnabled: boolean;
  owners?: string[];
}

export interface WhitelistContextType {
  whitelist: WhitelistEntry[];
  isWhitelisted: boolean;
  isOwner: boolean;
  allOwners: string[]; // New property to get all owner addresses
  addToWhitelist: (address: string, label: string, permissions: string[]) => void;
  removeFromWhitelist: (address: string) => boolean;
  addOwner: (address: string, label: string) => void; // New method to add owner
  removeOwner: (address: string) => boolean; // New method to remove owner
  saveWhitelist: (config: WhitelistConfig) => void;
  loadWhitelist: () => WhitelistConfig | null;
  isInSetupMode: boolean; // New property to track setup mode
  setIsInSetupMode: (isInSetup: boolean) => void; // New method to set setup mode
  isWhitelistLoading: boolean; // Added loading state
  isPermissionCheckComplete: boolean; // NEW: Flag to signal permission check is done for the current address
}

const WhitelistContext = createContext<WhitelistContextType | undefined>(undefined);

// Local storage key for whitelist
const WHITELIST_STORAGE_KEY = 'quicktoken_whitelist_config';

/**
 * Hook for accessing the whitelist context
 */
export const useWhitelist = (): WhitelistContextType => {
  const context = useContext(WhitelistContext);
  if (context === undefined) {
    throw new Error('useWhitelist must be used within a WhitelistProvider');
  }
  return context;
};

interface WhitelistProviderProps {
  children: ReactNode;
}

/**
 * Provider for whitelist management
 * 
 * Handles whitelist state, permissions, and persistence
 */
export const WhitelistProvider: React.FC<WhitelistProviderProps> = ({ children }) => {
  const { address } = useWallet();
  
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isInSetupMode, setIsInSetupMode] = useState(false);
  const [isWhitelistLoading, setIsWhitelistLoading] = useState(true); // Add loading state, default true
  const [isPermissionCheckComplete, setIsPermissionCheckComplete] = useState(false); // NEW state
  
  // Load whitelist, prioritizing localStorage but seeding it from static config on first load.
  useEffect(() => {
    const initializeWhitelist = async () => {
      console.log("[WhitelistContext] Initialize function START.");
      setIsWhitelistLoading(true);
      let usedDataSource = 'unknown';
      let shouldSeedLocalStorage = false; // Flag to track if seeding is needed
      
      try {
        console.log(`[WhitelistContext] Attempting to read from localStorage key: ${WHITELIST_STORAGE_KEY}`);
        const storedWhitelist = localStorage.getItem(WHITELIST_STORAGE_KEY);
        console.log(`[WhitelistContext] Raw data from localStorage: ${storedWhitelist ? `'${storedWhitelist.substring(0, 100)}...'` : 'null'}`);

        if (storedWhitelist) {
          console.log("[WhitelistContext] Found data in localStorage. Attempting to parse...");
          try {
            const parsedConfig = JSON.parse(storedWhitelist);
            console.log("[WhitelistContext] Parsed localStorage data:", JSON.stringify(parsedConfig));
            if (parsedConfig && Array.isArray(parsedConfig.entries)) {
              console.log(`[WhitelistContext] SUCCESS: Using valid localStorage whitelist with ${parsedConfig.entries.length} entries.`);
              setWhitelist(parsedConfig.entries);
              usedDataSource = 'localStorage (valid)';
            } else {
              console.warn("[WhitelistContext] WARNING: Invalid format in localStorage. Falling back to static config attempt.");
              usedDataSource = 'localStorage (invalid format)';
            }
          } catch (parseError) {
            console.error("[WhitelistContext] ERROR: Failed to parse localStorage whitelist:", parseError, ". Falling back to static config attempt.");
            usedDataSource = 'localStorage (parse error)';
          }
        } else {
           console.log("[WhitelistContext] INFO: No whitelist found in localStorage. Will attempt to load from static config and seed localStorage.");
           usedDataSource = 'localStorage (empty)';
           shouldSeedLocalStorage = true; // Set the flag here!
        }

        // If data wasn't successfully loaded from localStorage, attempt static load
        if (usedDataSource !== 'localStorage (valid)') {
          console.log("[WhitelistContext] Attempting to fetch static config from '/dashboard-config.json' as primary source or fallback...");
          const response = await fetch('/dashboard-config.json');
          console.log(`[WhitelistContext] Static config fetch response status: ${response.status}`);
          
          if (response.ok) {
            const fullConfig = await response.json();
            console.log("[WhitelistContext] Static config loaded successfully:", JSON.stringify(fullConfig).substring(0, 200) + '...');
            
            if (fullConfig && fullConfig.whitelist && Array.isArray(fullConfig.whitelist.entries)) {
              const staticWhitelistConfig = fullConfig.whitelist;
              console.log(`[WhitelistContext] SUCCESS: Using static config whitelist with ${staticWhitelistConfig.entries.length} entries.`);
              setWhitelist(staticWhitelistConfig.entries);
              // Update usedDataSource *after* potential seeding
              // usedDataSource = 'static config (valid)'; // Moved this down
              
              // ** Use the dedicated flag for the seeding check **
              if (shouldSeedLocalStorage) {
                console.log("[WhitelistContext] Condition met: shouldSeedLocalStorage is true. Attempting to seed...");
                try {
                  const dataToSave = JSON.stringify(staticWhitelistConfig);
                  console.log(`[WhitelistContext] Data prepared for seeding localStorage: ${dataToSave.substring(0, 150)}...`);
                  localStorage.setItem(WHITELIST_STORAGE_KEY, dataToSave);
                  const checkSavedData = localStorage.getItem(WHITELIST_STORAGE_KEY);
                  console.log(`[WhitelistContext] INFO: Seeding attempt complete. Data in localStorage post-save: ${checkSavedData ? `'${checkSavedData.substring(0, 100)}...'` : 'null'}`);
                } catch (saveError) {
                  console.error("[WhitelistContext] ERROR: Failed during attempt to save initial whitelist data to localStorage:", saveError);
                }
              } 
              // Now update the data source string *after* seeding logic
              usedDataSource = 'static config (valid)'; 
              
            } else {
              console.warn("[WhitelistContext] WARNING: Static dashboard-config.json missing or has invalid whitelist structure. Initializing empty whitelist.");
              setWhitelist([]);
              usedDataSource = 'static config (invalid format)';
            }
          } else {
            console.error(`[WhitelistContext] ERROR: Failed to fetch dashboard-config.json. Status: ${response.status}. Initializing empty whitelist.`);
            setWhitelist([]);
            usedDataSource = 'static config (fetch error)';
          }
        }
      } catch (error) {
         console.error("[WhitelistContext] CRITICAL ERROR during initialization:", error, ". Initializing empty whitelist.");
         setWhitelist([]);
         usedDataSource = 'critical error';
      } finally {
        setIsWhitelistLoading(false);
        console.log(`[WhitelistContext] Initialization FINALLY block. Whitelist loading complete. Final data source: ${usedDataSource}`);
      }
    };

    initializeWhitelist();
  }, []);

  // Update permissions whenever the connected address changes AFTER whitelist is loaded
  useEffect(() => {
    // Reset the flag when the check starts or address becomes null
    setIsPermissionCheckComplete(false); 
    
    // Only run if the whitelist is NOT loading
    if (isWhitelistLoading) {
      console.log("[WhitelistContext] Permission check skipped - whitelist still loading");
      return; 
    }

    console.log(`
--- [WhitelistContext] PERMISSION CHECK START ---
Address: ${address || 'null'}
isWhitelistLoading: ${isWhitelistLoading}
Whitelist entries count: ${whitelist.length}
Whitelist data: ${JSON.stringify(whitelist)}
---`);

    const currentAddress = address ? address.toLowerCase() : null;
    
    if (!currentAddress) {
      console.log("[WhitelistContext] No wallet address available, setting permissions false");
      setIsWhitelisted(false);
      setIsOwner(false);
      return;
    }

    console.log(`[WhitelistContext] Checking address ${currentAddress} against whitelist with ${whitelist.length} entries`);
    
    const entry = whitelist.find(item => {
      const match = item.address.toLowerCase() === currentAddress;
      console.log(`[WhitelistContext] Comparing: ${item.address.toLowerCase()} vs ${currentAddress} = ${match}`);
      return match;
    });
    
    if (entry) {
      console.log(`[WhitelistContext] Found whitelist entry: ${JSON.stringify(entry)}`);
      const ownerPermission = entry.permissions.includes('owner');
      const adminPermission = entry.permissions.includes('admin');
      const finalWhitelisted = ownerPermission || adminPermission;
      
      console.log(`[WhitelistContext] Permission results:
        Owner: ${ownerPermission}
        Admin: ${adminPermission}
        Final isWhitelisted: ${finalWhitelisted}`);
      
      setIsOwner(ownerPermission);
      setIsWhitelisted(finalWhitelisted); 
    } else {
      console.log(`[WhitelistContext] No matching entry found for ${currentAddress}, setting permissions false`);
      setIsWhitelisted(false);
      setIsOwner(false);
    }
    
    console.log(`--- [WhitelistContext] PERMISSION CHECK COMPLETE ---`);
    setIsPermissionCheckComplete(true); // SET flag to true when check finishes

  // Trigger specifically when address changes, but only after isWhitelistLoading is false.
  }, [address, isWhitelistLoading, whitelist]); // Keep whitelist as dep in case it ever changes

  // Get all owner addresses from the whitelist
  const getAllOwners = (): string[] => {
    return whitelist
      .filter(entry => entry.permissions.includes('owner'))
      .map(entry => entry.address.toLowerCase());
  };
  
  // --- Whitelist Modification Logic ---

  // Helper function to save the current whitelist state to localStorage
  const saveCurrentWhitelistToLocalStorage = (updatedEntries: WhitelistEntry[]) => {
    try {
      // Construct the full WhitelistConfig object expected by localStorage
      const currentOwner = updatedEntries.find(e => e.permissions.includes('owner'))?.address || ''; // Find current owner
      const configToSave: WhitelistConfig = {
        entries: updatedEntries,
        ownerAddress: currentOwner, // Use the potentially updated owner
        lastModified: Date.now(),
        whitelistEnabled: true, // Assuming always true when saved from context modifications
        // owners: updatedEntries.filter(e => e.permissions.includes('owner')).map(e => e.address) // Optional: could regenerate this
      };
      localStorage.setItem(WHITELIST_STORAGE_KEY, JSON.stringify(configToSave));
      console.log(`[WhitelistContext] Saved updated whitelist (${updatedEntries.length} entries) to localStorage.`);
    } catch (error) {
      console.error('[WhitelistContext] Failed to save whitelist to localStorage:', error);
    }
  };

  // Add an address to the whitelist
  const addToWhitelist = (addressToAdd: string, label: string, permissions: string[]) => {
    const normalizedAddress = addressToAdd.toLowerCase();
    // Prevent duplicates
    if (whitelist.some(entry => entry.address.toLowerCase() === normalizedAddress)) {
      console.warn(`[WhitelistContext] Address ${normalizedAddress} already exists in whitelist.`);
      // Maybe provide user feedback here via a notification context?
      return; 
    }

    const newEntry: WhitelistEntry = {
      address: normalizedAddress,
      label,
      addedAt: Date.now(),
      permissions,
    };

    const updatedWhitelist = [...whitelist, newEntry];
    setWhitelist(updatedWhitelist);
    saveCurrentWhitelistToLocalStorage(updatedWhitelist); // Save updated list
  };
  
  // Remove an address from the whitelist 
  const removeFromWhitelist = (addressToRemove: string): boolean => {
    const normalizedAddressToRemove = addressToRemove.toLowerCase();
    const entryToRemove = whitelist.find(e => e.address.toLowerCase() === normalizedAddressToRemove);

    if (!entryToRemove) {
      console.warn(`[WhitelistContext] Address ${normalizedAddressToRemove} not found.`);
      return false;
    }

    // Prevent removing the last owner
    const ownerEntries = whitelist.filter(e => e.permissions.includes('owner'));
    if (entryToRemove.permissions.includes('owner') && ownerEntries.length <= 1) {
       console.warn('[WhitelistContext] Cannot remove the last owner.');
       // Provide user feedback needed here (e.g., notification)
       return false;
    }

    const updatedWhitelist = whitelist.filter(entry => entry.address.toLowerCase() !== normalizedAddressToRemove);
    setWhitelist(updatedWhitelist);
    saveCurrentWhitelistToLocalStorage(updatedWhitelist); // Save updated list
    return true;
  };
  
  // Convenience method to add an owner (uses addToWhitelist)
  const addOwner = (address: string, label: string) => {
    // Ensure 'owner' and 'admin' permissions are included
    const permissions = ['owner', 'admin'];
    addToWhitelist(address, label || 'Owner', permissions);
  };
  
  // Convenience method to remove an owner (uses removeFromWhitelist)
  const removeOwner = (address: string): boolean => {
    // Simply call the main remove function
    return removeFromWhitelist(address);
  };

  // --- Deprecated / Placeholder Functions ---
  const legacyLoadWhitelist = (): null => {
     console.warn("legacyLoadWhitelist is deprecated. Whitelist loads on init.");
     return null;
  }; 
  const legacySaveWhitelist = (config: WhitelistConfig) => {
     console.warn("legacySaveWhitelist is deprecated. Use context modification functions (addToWhitelist/removeOwner).");
  }; 
  
  // Helper to get current wallet address safely (still useful internally)
  const getCurrentWalletAddress = (): string => {
    return address ? address.toLowerCase() : '';
  };
  
  // Context value
  const value: WhitelistContextType = {
    whitelist,
    isWhitelisted,
    isOwner,
    allOwners: getAllOwners(),
    addToWhitelist,
    removeFromWhitelist,
    addOwner,
    removeOwner,
    saveWhitelist: legacySaveWhitelist,
    loadWhitelist: legacyLoadWhitelist,
    isInSetupMode,
    setIsInSetupMode,
    isWhitelistLoading, // Provide loading state in context value
    isPermissionCheckComplete // NEW: Expose the flag
  };
  
  return (
    <WhitelistContext.Provider value={value}>
      {children}
    </WhitelistContext.Provider>
  );
};

export default WhitelistContext; 