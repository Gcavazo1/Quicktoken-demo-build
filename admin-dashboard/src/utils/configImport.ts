import { DashboardConfiguration } from './configExport';

/**
 * Result of configuration import operation
 */
export interface ImportResult {
  success: boolean;
  error?: string;
  config?: DashboardConfiguration;
}

/**
 * Validates that a configuration object has the expected structure
 * @param config Configuration object to validate
 * @returns True if valid, false otherwise
 */
export function validateConfig(config: any): boolean {
  // Check for required top-level properties
  if (!config || typeof config !== 'object') return false;
  if (!config.core || !config.whitelist || !config.meta) return false;
  
  // Check for required metadata
  if (typeof config.meta !== 'object') return false;
  if (typeof config.meta.version !== 'string') return false;
  if (typeof config.meta.exportedAt !== 'number') return false;
  
  // Check core config (basic validation)
  if (typeof config.core !== 'object') return false;
  
  // Check whitelist config (basic validation)
  if (typeof config.whitelist !== 'object') return false;
  if (!Array.isArray(config.whitelist.entries)) return false;
  
  return true;
}

/**
 * Loads and validates a configuration file
 * @param fileContent JSON string containing configuration
 * @returns Import result with success status and error if applicable
 */
export function importConfig(fileContent: string): ImportResult {
  try {
    // Parse JSON content
    const config = JSON.parse(fileContent);
    
    // Validate configuration structure
    if (!validateConfig(config)) {
      return {
        success: false,
        error: 'Invalid configuration file structure'
      };
    }
    
    // Store in localStorage
    localStorage.setItem('quicktoken_config', JSON.stringify(config.core));
    localStorage.setItem('quicktoken_whitelist_config', JSON.stringify(config.whitelist));
    localStorage.setItem('quicktoken_setup_complete', 'true');
    localStorage.setItem('quicktoken_config_imported', 'true');
    localStorage.setItem('quicktoken_config_imported_at', Date.now().toString());
    
    return {
      success: true,
      config
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse configuration'
    };
  }
}

/**
 * Loads configuration from static file in public directory
 * @returns Promise resolving to import result
 */
export async function loadStaticConfiguration(): Promise<ImportResult> {
  try {
    // Try to fetch the static configuration file
    const response = await fetch('/dashboard-config.json');
    
    // If file doesn't exist, return failure
    if (!response.ok) {
      return {
        success: false,
        error: 'Configuration file not found'
      };
    }
    
    // Parse the configuration
    const fileContent = await response.text();
    return importConfig(fileContent);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error loading configuration'
    };
  }
} 