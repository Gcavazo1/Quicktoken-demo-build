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
  
  // Load whitelist from STATIC CONFIG on component mount
  useEffect(() => {
    const initializeWhitelist = async () => {
      console.log("[WhitelistContext] Initialize function START."); // START Log
      setIsWhitelistLoading(true);
      
      try {
        // First try to load from localStorage
        console.log(`[WhitelistContext] Attempting to read from localStorage key: ${WHITELIST_STORAGE_KEY}`); // Log key
        const storedWhitelist = localStorage.getItem(WHITELIST_STORAGE_KEY);
        console.log(`[WhitelistContext] Raw data from localStorage: ${storedWhitelist ? `'${storedWhitelist.substring(0, 100)}...'` : 'null'}`); // Log raw data (truncated)
        
        if (storedWhitelist) {
          console.log("[WhitelistContext] Found data in localStorage. Attempting to parse...");
          try {
            const parsedConfig = JSON.parse(storedWhitelist);
            console.log("[WhitelistContext] Parsed localStorage data:", JSON.stringify(parsedConfig)); // Log parsed data
            
            if (parsedConfig && Array.isArray(parsedConfig.entries)) {
              console.log(`[WhitelistContext] SUCCESS: Using localStorage whitelist with ${parsedConfig.entries.length} entries.`);
              setWhitelist(parsedConfig.entries);
              setIsWhitelistLoading(false);
              console.log("[WhitelistContext] Initialization complete using localStorage."); // End Log (LS Success)
              return; // Exit early if localStorage data was valid
            } else {
              console.warn("[WhitelistContext] WARNING: Invalid whitelist format in localStorage (parsed, but no 'entries' array). Falling back to static config.");
            }
          } catch (parseError) {
            console.error("[WhitelistContext] ERROR: Failed to parse localStorage whitelist:", parseError, ". Falling back to static config.");
          }
        } else {
          console.log("[WhitelistContext] INFO: No whitelist found in localStorage. Falling back to static config.");
        }
        
        // Fall back to static config if localStorage failed or was invalid
        console.log("[WhitelistContext] Attempting to fetch static config from '/dashboard-config.json'...");
        const response = await fetch('/dashboard-config.json');
        console.log(`[WhitelistContext] Static config fetch response status: ${response.status}`);
        
        if (response.ok) {
          const fullConfig = await response.json();
          console.log("[WhitelistContext] Static config loaded successfully:", JSON.stringify(fullConfig).substring(0, 200) + '...'); // Log fetched data (truncated)
          
          if (fullConfig && fullConfig.whitelist && Array.isArray(fullConfig.whitelist.entries)) {
            console.log(`[WhitelistContext] SUCCESS: Using static config whitelist with ${fullConfig.whitelist.entries.length} entries.`);
            setWhitelist(fullConfig.whitelist.entries);
          } else {
            console.warn("[WhitelistContext] WARNING: Static dashboard-config.json missing or has invalid whitelist structure. Initializing empty whitelist.");
            setWhitelist([]);
          }
        } else {
          console.error(`[WhitelistContext] ERROR: Failed to fetch dashboard-config.json. Status: ${response.status}. Initializing empty whitelist.`);
          setWhitelist([]); // Initialize empty if fetch fails
        }
      } catch (fetchError) { // Changed variable name for clarity
         console.error("[WhitelistContext] CRITICAL ERROR during initialization (fetch or other):", fetchError, ". Initializing empty whitelist.");
         setWhitelist([]); // Initialize empty on error
      } finally {
        setIsWhitelistLoading(false);
        console.log("[WhitelistContext] Initialization FINALLY block reached. isWhitelistLoading set to false."); // End Log (Finally)
      }
    };

    initializeWhitelist();
  }, []); // Runs only once on mount

  // Update permissions whenever the connected address changes AFTER whitelist is loaded
  useEffect(() => {
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

  // Trigger specifically when address changes, but only after isWhitelistLoading is false.
  }, [address, isWhitelistLoading, whitelist]); // Keep whitelist as dep in case it ever changes

  // Get all owner addresses from the whitelist
  const getAllOwners = (): string[] => {
    return whitelist
      .filter(entry => entry.permissions.includes('owner'))
      .map(entry => entry.address.toLowerCase());
  };
  
  // Add an address to the whitelist (DEPRECATED - Use SettingsPage state modification)
  const addToWhitelist = (address: string, label: string, permissions: string[]) => {
     console.warn("addToWhitelist directly on context is deprecated. Modify config via SettingsPage.");
     // Potential future implementation: Dispatch an event or update a central config store?
  };
  
  // Remove an address from the whitelist (DEPRECATED - Use SettingsPage state modification)
  const removeFromWhitelist = (addressToRemove: string): boolean => {
    console.warn("removeFromWhitelist directly on context is deprecated. Modify config via SettingsPage.");
    return false; // Indicate failure as it doesn't modify state
  };
  
  // Convenience method to add an owner (DEPRECATED)
  const addOwner = (address: string, label: string) => {
    console.warn("addOwner directly on context is deprecated. Modify config via SettingsPage.");
  };
  
  // Convenience method to remove an owner (DEPRECATED)
  const removeOwner = (address: string): boolean => {
    console.warn("removeOwner directly on context is deprecated. Modify config via SettingsPage.");
    return false;
  };

  // Save/Load functions are no longer needed here as config is managed externally
  const legacyLoadWhitelist = (): null => null; // Placeholder
  const legacySaveWhitelist = (config: WhitelistConfig) => {}; // Placeholder
  
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
    isWhitelistLoading // Provide loading state in context value
  };
  
  return (
    <WhitelistContext.Provider value={value}>
      {children}
    </WhitelistContext.Provider>
  );
};

export default WhitelistContext; 