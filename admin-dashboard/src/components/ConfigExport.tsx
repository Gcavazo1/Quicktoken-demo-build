import React, { useState, useEffect } from 'react';
import { useWhitelist } from '../contexts/WhitelistContext';
import { createConfigDownload, revokeConfigUrl } from '../utils/configExport';
import HelpIcon from './HelpIcon';
import WalletConnector from '../services/WalletConnector';
import { QuickTokenConfig } from '../pages/SetupWizard'; // Import config type

interface ConfigExportProps {
  className?: string;
  showTitle?: boolean;
  isSetupMode?: boolean;
  onExportComplete?: () => void;
  // Add props to receive config and account when in setup mode
  configForExport?: QuickTokenConfig; 
  accountForExport?: string | null;
}

/**
 * Component for exporting dashboard configuration
 * Provides UI for admin users to export dashboard config to a JSON file
 */
const ConfigExport: React.FC<ConfigExportProps> = ({ 
  className = '',
  showTitle = true,
  isSetupMode = false,
  onExportComplete,
  // Destructure new props
  configForExport, 
  accountForExport 
}) => {
  const { isWhitelisted } = useWhitelist();
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  
  // Cleanup URL object when component unmounts
  useEffect(() => {
    return () => {
      if (exportUrl) {
        revokeConfigUrl(exportUrl);
      }
    };
  }, [exportUrl]);
  
  // Check if wallet is connected on mount and periodically
  useEffect(() => {
    checkWalletConnection();
    
    const intervalId = setInterval(checkWalletConnection, 3000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);
  
  // Check wallet connection state
  const checkWalletConnection = async () => {
    try {
      const { account } = await WalletConnector.getConnectionState();
      setWalletConnected(!!account);
    } catch (error) {
      console.error('Error checking wallet connection:', error);
      setWalletConnected(false);
    }
  };
  
  const handleExport = () => {
    setIsExporting(true);
    
    // Ensure account is available for export metadata
    const exporterAddress = isSetupMode ? (accountForExport || '') : (localStorage.getItem('quicktoken_last_connected_address') || '');
    
    // Short timeout to allow UI to update with loading state
    setTimeout(() => {
      try {
        // Pass config and exporter address to the utility
        const { url } = createConfigDownload(configForExport, exporterAddress); 
        setExportUrl(url);
        
        // In setup mode, we want to notify that export is available
        if (isSetupMode) {
          const event = new Event('quicktoken_export_ready');
          window.dispatchEvent(event);
        }
      } catch (error) {
        console.error('Error creating config download:', error);
        // Display error to user
        if (error instanceof Error) {
          alert(`Export failed: ${error.message}`);
        } else {
          alert('Export failed: Could not create configuration download.');
        }
      }
      setIsExporting(false);
    }, 100);
  };
  
  const handleDownload = () => {
    setHasDownloaded(true);
    
    // Notify completion through callback and event
    if (onExportComplete) {
      onExportComplete();
    }
    
    // Dispatch custom event for components that need to know export is complete
    const event = new Event('quicktoken_export_complete');
    window.dispatchEvent(event);
  };
  
  return (
    <div className={`p-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 ${className}`}>
      {showTitle && (
        <h3 className="text-lg font-medium mb-2 dark:text-white">
          Dashboard Configuration Export
          <HelpIcon 
            content={
              <div>
                <p><strong>Why export configuration?</strong></p>
                <p className="mt-1">Exporting your configuration allows all users to see your preconfigured dashboard instead of the setup wizard.</p>
                <p className="mt-2"><strong>How it works:</strong></p>
                <ol className="list-decimal pl-5 mt-1">
                  <li>Download the JSON configuration file</li>
                  <li>Add it to your project at <code className="px-1 py-0.5 bg-gray-700 rounded text-xs">/public/dashboard-config.json</code></li>
                  <li>Commit and deploy your updates</li>
                  <li>All users will now see your configured dashboard</li>
                </ol>
              </div>
            } 
            width="350px"
          />
        </h3>
      )}
      
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Export your dashboard configuration to deploy it for all users.
        Add this file to your repository at <code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-sm">/public/dashboard-config.json</code>.
        <HelpIcon 
          content={
            <div>
              <p><strong>Technical details:</strong></p>
              <p className="mt-1">The configuration file contains all your dashboard settings:</p>
              <ul className="list-disc pl-5 mt-1">
                <li>Platform fee settings</li>
                <li>Whitelist configuration</li>
                <li>Network settings</li>
                <li>Wallet connection options</li>
                <li>Visual theme preferences</li>
              </ul>
              <p className="mt-2 text-xs">Note: No private keys or sensitive data are included in this export.</p>
            </div>
          } 
          width="320px"
        />
      </p>
      
      {(isWhitelisted || isSetupMode) ? (
        <>
          {!walletConnected && !isSetupMode && (
            <div className="p-3 mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 rounded-md">
              <strong>Wallet not connected:</strong> Please connect your wallet to access the export functionality.
            </div>
          )}
          
          <button
            onClick={handleExport}
            disabled={isExporting || !walletConnected}
            className={`px-4 py-2 text-white rounded flex items-center ${
              isExporting 
                ? 'bg-blue-500 cursor-not-allowed opacity-70' 
                : !walletConnected
                ? 'bg-blue-400 cursor-not-allowed opacity-50'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isExporting ? (
              <>
                <span className="mr-2">Please wait</span>
                Exporting...
              </>
            ) : (
              <>
                Export Configuration
              </>
            )}
          </button>
          
          {exportUrl && (
            <div className="mt-4">
              <a
                href={exportUrl}
                download="dashboard-config.json"
                onClick={handleDownload}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center w-fit"
              >
                Download Configuration File
              </a>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                File will be named "dashboard-config.json". Add this file to your project's public directory.
                <HelpIcon 
                  content={
                    <div>
                      <p><strong>Deployment instructions:</strong></p>
                      <ol className="list-decimal pl-5 mt-1">
                        <li>Download the file using the button above</li>
                        <li>Place it in your project's public directory</li>
                        <li>The path should be <code className="px-1 py-0.5 bg-gray-700 rounded text-xs">/public/dashboard-config.json</code></li>
                        <li>Commit and push these changes to your repository</li>
                        <li>Deploy the updated project to your hosting provider</li>
                      </ol>
                      <p className="mt-2 text-xs italic">Without this step, users will continue to see the setup wizard.</p>
                    </div>
                  } 
                  width="350px"
                  position="left"
                />
              </p>
            </div>
          )}
        </>
      ) : (
        <p className="text-yellow-600 dark:text-yellow-400">
          Only whitelisted administrators can export dashboard configuration.
        </p>
      )}
    </div>
  );
};

export default ConfigExport; 