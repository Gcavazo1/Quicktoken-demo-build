import { QuickTokenConfig } from '../pages/SetupWizard';
import { WhitelistConfig } from '../contexts/WhitelistContext';

// Constants for localStorage keys
const CORE_CONFIG_KEY = 'quicktoken_config';
const WHITELIST_CONFIG_KEY = 'quicktoken_whitelist_config';
const LAST_CONNECTED_ADDRESS_KEY = 'quicktoken_last_connected_address';

/**
 * Dashboard configuration structure
 * Consolidates all configuration data for export/import
 */
export interface DashboardConfiguration {
  // Core configuration from setup wizard
  core: QuickTokenConfig;
  
  // Whitelist configuration
  whitelist: WhitelistConfig;
  
  // Metadata
  meta: {
    version: string;
    exportedAt: number;
    exportedBy: string; // Address of the admin who exported
  };
}

/**
 * Safely parse JSON from localStorage with fallback
 * @param key localStorage key to retrieve
 * @param defaultValue fallback value if parsing fails
 * @returns parsed object or default value
 */
function safelyParseJSON(key: string, defaultValue: any = {}) {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item);
  } catch (error) {
    console.error(`Error parsing JSON from localStorage key "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Assembles all configuration data into an exportable object
 * @param coreConfig The core configuration object passed from the wizard/app state.
 * @param exporterAddress The address of the user performing the export.
 * @returns Complete dashboard configuration
 */
export function assembleExportableConfig(
    coreConfig: QuickTokenConfig | undefined | null, 
    exporterAddress: string
  ): DashboardConfiguration {
  
  // Read ONLY whitelist from localStorage. Core config is passed in.
  const whitelistConfig = safelyParseJSON(WHITELIST_CONFIG_KEY, {});
  // const connectedAddress = localStorage.getItem(LAST_CONNECTED_ADDRESS_KEY) || ''; // No longer needed
  
  return {
    core: coreConfig || {}, // Use passed-in coreConfig, default to {} if null/undefined
    whitelist: whitelistConfig,
    meta: {
      version: '1.0.0', // Current dashboard version
      exportedAt: Date.now(),
      exportedBy: exporterAddress // Use the passed-in address
    }
  };
}

/**
 * Creates a downloadable configuration file
 * @param coreConfig Core config object (optional, defaults to reading from storage if not provided)
 * @param exporterAddress Address performing the export
 * @returns Object with download URL and JSON blob
 */
export function createConfigDownload(
    coreConfig?: QuickTokenConfig | null, 
    exporterAddress: string = '' // Default to empty if not provided
  ) {
  // If coreConfig is not provided (e.g., exporting from outside setup wizard),
  // attempt to read from localStorage as a fallback.
  const finalCoreConfig = coreConfig ?? safelyParseJSON(CORE_CONFIG_KEY, {});

  const config = assembleExportableConfig(finalCoreConfig, exporterAddress);
  const configJson = JSON.stringify(config, null, 2);
  const blob = new Blob([configJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  return {
    url,
    filename: 'dashboard-config.json',
    blob,
    configJson
  };
}

/**
 * Cleanup function to revoke object URL when done
 * @param url URL created by URL.createObjectURL
 */
export function revokeConfigUrl(url: string) {
  URL.revokeObjectURL(url);
} 