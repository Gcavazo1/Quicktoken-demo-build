import React, { useState } from 'react';
import { useWhitelist } from '../contexts/WhitelistContext';
import { importConfig } from '../utils/configImport';
import { useNotification } from '../contexts/NotificationContext';

interface ConfigImportProps {
  className?: string;
  showTitle?: boolean;
  onImportSuccess?: () => void;
}

/**
 * Component for importing dashboard configuration
 * Provides UI for admin users to import a previously exported configuration file
 */
const ConfigImport: React.FC<ConfigImportProps> = ({ 
  className = '',
  showTitle = true,
  onImportSuccess
}) => {
  const { isWhitelisted } = useWhitelist();
  const { showNotification } = useNotification();
  const [file, setFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setImportStatus('idle');
      setErrorMessage('');
    }
  };
  
  const handleImport = async () => {
    if (!file) return;
    
    setImportStatus('loading');
    
    try {
      const fileContent = await file.text();
      const result = importConfig(fileContent);
      
      if (result.success) {
        setImportStatus('success');
        showNotification('Configuration imported successfully!', 'success');
        
        // If callback provided, call it
        if (onImportSuccess) {
          onImportSuccess();
        } else {
          // Otherwise reload after a delay
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } else {
        setImportStatus('error');
        setErrorMessage(result.error || 'Unknown error importing configuration');
        showNotification(result.error || 'Failed to import configuration', 'error');
      }
    } catch (error) {
      console.error('Error importing configuration:', error);
      setImportStatus('error');
      const message = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(message);
      showNotification(`Failed to import configuration: ${message}`, 'error');
    }
  };
  
  return (
    <div className={`p-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 ${className}`}>
      {showTitle && (
        <h3 className="text-lg font-medium mb-2 dark:text-white">Import Configuration</h3>
      )}
      
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Import a previously exported dashboard configuration file.
      </p>
      
      {isWhitelisted ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Configuration File
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900 dark:file:text-blue-200 hover:file:bg-blue-100 dark:hover:file:bg-blue-800"
            />
          </div>
          
          <button
            onClick={handleImport}
            disabled={!file || importStatus === 'loading' || importStatus === 'success'}
            className={`px-4 py-2 rounded flex items-center ${
              !file || importStatus === 'loading' || importStatus === 'success'
                ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {importStatus === 'loading' ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Importing...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import Configuration
              </>
            )}
          </button>
          
          {importStatus === 'success' && (
            <div className="p-3 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Configuration imported successfully! Reloading dashboard...
              </div>
            </div>
          )}
          
          {importStatus === 'error' && (
            <div className="p-3 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Error importing configuration: {errorMessage}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-yellow-600 dark:text-yellow-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Only whitelisted administrators can import dashboard configuration.
        </p>
      )}
    </div>
  );
};

export default ConfigImport; 