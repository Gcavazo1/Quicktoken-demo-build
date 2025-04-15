import React, { useState, useRef, useEffect } from 'react';
import { useNetwork } from '../contexts/NetworkContext';
import type { NetworkType } from '../contexts/NetworkContext';

interface NetworkSwitchProps {
  compact?: boolean;
}

const NetworkSwitch: React.FC<NetworkSwitchProps> = ({ compact = false }) => {
  const { 
    currentNetwork, 
    configuredNetworks: supportedNetworks,
    setNetwork, 
    isChangingNetwork,
  } = useNetwork();
  
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Group networks into mainnets and testnets
  const mainnets = supportedNetworks.filter(network => !network.testnet);
  const testnets = supportedNetworks.filter(network => network.testnet);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNetworkSelect = (network: NetworkType) => {
    setNetwork(network);
    setIsOpen(false);
  };

  // Get current network or default to first supported network
  const current = currentNetwork || (supportedNetworks.length > 0 ? supportedNetworks[0] : null);

  if (!current) {
    return null; // Or a loading state if preferred
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isChangingNetwork}
        className={`flex items-center ${compact ? 'px-3 py-1.5' : 'px-4 py-2'} bg-gray-800 hover:bg-gray-700 text-white text-base rounded-md transition-colors shadow-md border-2 border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isChangingNetwork ? 'opacity-75 cursor-not-allowed' : ''}`}
        title="Switch network"
      >
        {isChangingNetwork ? (
          <svg className="animate-spin mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <span className={`inline-block w-3 h-3 rounded-full mr-2 ${current.testnet ? 'bg-yellow-400' : 'bg-green-400'}`}></span>
        )}
        
        {compact ? (
          <span className="text-base font-medium truncate max-w-[100px]">{current.shortName || current.name}</span>
        ) : (
          <>
            <span className="text-base font-medium">{current.name}</span>
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 right-0 bg-gray-800 rounded-md shadow-2xl border-2 border-gray-700 overflow-hidden w-80">
          {(mainnets.length > 0 || testnets.length > 0) ? (
            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              {mainnets.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-sm font-bold text-white bg-gray-900 border-b-2 border-gray-700">
                    Mainnet Networks
                  </div>
                  <div className="divide-y-2 divide-gray-700">
                    {mainnets.map((network) => (
                      <button
                        key={network.chainId}
                        onClick={() => handleNetworkSelect(network)}
                        className={`w-full text-left px-5 py-4 text-base transition-colors ${
                          currentNetwork?.chainId === network.chainId 
                            ? 'bg-blue-700 hover:bg-blue-800 text-white' 
                            : 'text-white hover:bg-gray-700'
                        } flex items-center justify-between`}
                      >
                        <div className="flex items-center">
                          <span className="inline-block w-3 h-3 rounded-full mr-3 bg-green-400 flex-shrink-0"></span>
                          <div>
                            <div className="font-bold text-base">{network.name}</div>
                            <div className="text-sm text-gray-300">
                              {typeof network.currency === 'string' ? network.currency : network.currency.symbol}
                            </div>
                          </div>
                        </div>
                        {currentNetwork?.chainId === network.chainId && (
                          <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {testnets.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-sm font-bold text-white bg-gray-900 border-b-2 border-gray-700">
                    Testnet Networks
                  </div>
                  <div className="divide-y-2 divide-gray-700">
                    {testnets.map((network) => (
                      <button
                        key={network.chainId}
                        onClick={() => handleNetworkSelect(network)}
                        className={`w-full text-left px-5 py-4 text-base transition-colors ${
                          currentNetwork?.chainId === network.chainId 
                            ? 'bg-blue-700 hover:bg-blue-800 text-white' 
                            : 'text-white hover:bg-gray-700'
                        } flex items-center justify-between`}
                      >
                        <div className="flex items-center">
                          <span className="inline-block w-3 h-3 rounded-full mr-3 bg-yellow-400 flex-shrink-0"></span>
                          <div>
                            <div className="font-bold text-base">{network.name}</div>
                            <div className="text-sm text-gray-300">
                              {typeof network.currency === 'string' ? network.currency : network.currency.symbol}
                            </div>
                          </div>
                        </div>
                        {currentNetwork?.chainId === network.chainId && (
                          <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-5 text-center text-base text-white bg-gray-800">
              <p>No networks available</p>
              <p className="mt-2 text-sm text-gray-300">Configure networks in Settings</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NetworkSwitch; 