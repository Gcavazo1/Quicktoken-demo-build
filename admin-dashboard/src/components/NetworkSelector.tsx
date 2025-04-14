import React, { useState, useEffect, ReactNode } from 'react';
import { useNetwork } from '../contexts/NetworkContext';
import { getNetworkBadgeClass } from '../shared/constants/networks';
import type { NetworkType } from '../contexts/NetworkContext';

interface NetworkSelectorProps {
  onNetworkChange?: (chainId: number) => void;
  currentChainId?: number | null;
  showTestnets?: boolean;
  className?: string;
}

const NetworkSelector: React.FC<NetworkSelectorProps> = ({
  onNetworkChange,
  currentChainId = null,
  showTestnets = true,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const {
    supportedNetworks,
    currentNetwork,
    getNetworkByChainId: isNetworkConfigured,
    setNetwork,
    isChangingNetwork,
    getConfiguredNetworks
  } = useNetwork();

  // State for configured networks from setup
  const [configuredNetworks, setConfiguredNetworks] = useState<NetworkType[]>([]);
  const [mainnets, setMainnets] = useState<NetworkType[]>([]);
  const [testnets, setTestnets] = useState<NetworkType[]>([]);

  // Load enabled networks from setup config
  useEffect(() => {
    // Use the centralized function from NetworkContext
    const enabledNetworks = getConfiguredNetworks();
    setConfiguredNetworks(enabledNetworks);
  }, [getConfiguredNetworks]);

  // Group networks into mainnets and testnets
  useEffect(() => {
    const mainnetNetworks = configuredNetworks.filter(network => !network.testnet);
    const testnetNetworks = configuredNetworks.filter(network => network.testnet);
    
    setMainnets(mainnetNetworks);
    setTestnets(testnetNetworks);
  }, [configuredNetworks]);
  
  // Lock scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  const handleNetworkSelect = (chainId: number) => {
    setIsOpen(false);
    if (onNetworkChange) {
      onNetworkChange(chainId);
    } else {
      // If no onChange handler provided, try to switch network directly
      const network = configuredNetworks.find(n => n.chainId === chainId);
      if (network) {
        setNetwork(network);
      }
    }
  };
  
  // Determine the current network name to display
  const getCurrentNetworkDisplay = () => {
    if (currentChainId) {
      const network = configuredNetworks.find(n => n.chainId === currentChainId);
      if (network) {
        return (
          <div className="flex items-center">
            <span className="mr-2 text-base font-bold">{network.name}</span>
            <span className={`text-sm px-3 py-1 rounded-full font-bold ${getNetworkBadgeClass(network.chainId)}`}>
              {network.testnet ? 'Test' : 'Main'}
            </span>
          </div>
        );
      }
      
      // Check if on configured network
      if (!isNetworkConfigured(currentChainId)) {
        return (
          <div className="flex items-center text-yellow-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-base font-bold">Unsupported Network</span>
          </div>
        );
      }
    }
    
    if (currentNetwork) {
      return (
        <div className="flex items-center">
          <span className="mr-2 text-base font-bold">{currentNetwork.name}</span>
          <span className={`text-sm px-3 py-1 rounded-full font-bold ${getNetworkBadgeClass(currentNetwork.chainId)}`}>
            {currentNetwork.testnet ? 'Test' : 'Main'}
          </span>
        </div>
      );
    }
    
    return <div className="text-base font-bold">Select Network</div>;
  };
  
  const handleOpenModal = () => {
    setIsOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsOpen(false);
  };
  
  return (
    <>
      <div className={className}>
        <button
          onClick={handleOpenModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#262626',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '6px',
            border: '1px solid #2e2e2e',
            transition: 'all 0.2s',
            width: '100%',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            cursor: isChangingNetwork ? 'wait' : 'pointer'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#303030'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#262626'}
          disabled={isChangingNetwork}
        >
          {getCurrentNetworkDisplay()}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginLeft: '8px'
          }}>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              style={{
                width: '20px',
                height: '20px'
              }}
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            {isChangingNetwork && (
              <svg style={{
                animation: 'spin 1s linear infinite',
                marginLeft: '8px',
                height: '20px',
                width: '20px',
                color: 'white'
              }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle style={{opacity: 0.25}} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path style={{opacity: 0.75}} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
          </div>
        </button>
      </div>
      
      {/* Network Selection Modal */}
      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 9999
          }}
          onClick={handleCloseModal}
        >
          <div 
            style={{
              backgroundColor: '#1e1e1e',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.7)',
              width: '100%',
              maxWidth: '380px',
              overflow: 'hidden',
              position: 'relative',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid #2e2e2e'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              borderBottom: '1px solid #2e2e2e',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#262626'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 600,
                color: 'white'
              }}>
                Select Network
              </h3>
              <button 
                onClick={handleCloseModal}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#a0a0a0',
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = 'white'}
                onMouseOut={(e) => e.currentTarget.style.color = '#a0a0a0'}
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            {/* Modal Body */}
            <div style={{
              overflowY: 'auto',
              padding: '5px 0',
              flex: '1 1 auto',
              backgroundColor: '#1e1e1e'
            }}>
              {/* Current Network */}
              {currentNetwork && (
                <div style={{
                  padding: '10px 20px 5px 20px'
                }}>
                  <p style={{
                    margin: '0 0 8px 0',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: '#a0a0a0',
                    letterSpacing: '0.5px'
                  }}>
                    Currently Connected
                  </p>
                  <div style={{
                    backgroundColor: currentNetwork.testnet ? '#2d2718' : '#1b2c1e',
                    border: `1px solid ${currentNetwork.testnet ? '#423415' : '#2b4630'}`,
                    borderRadius: '6px',
                    padding: '12px 16px',
                    marginBottom: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        marginRight: '12px',
                        backgroundColor: currentNetwork.testnet ? '#f0b90b' : '#28a745'
                      }}></div>
                      <div>
                        <div style={{
                          fontWeight: 500,
                          color: 'white',
                          fontSize: '14px'
                        }}>{currentNetwork.name}</div>
                        <div className="text-sm text-gray-300">
                          {typeof currentNetwork.currency === 'string' ? currentNetwork.currency : currentNetwork.currency.symbol}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontWeight: 500,
                      color: currentNetwork.testnet ? '#f0b90b' : '#28a745',
                      backgroundColor: currentNetwork.testnet ? '#2d2718' : '#1b2c1e'
                    }}>
                      {currentNetwork.testnet ? 'Test' : 'Main'}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Mainnet Networks */}
              {mainnets.length > 0 && (
                <div style={{
                  padding: '10px 20px 5px 20px'
                }}>
                  <p style={{
                    margin: '0 0 8px 0',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: '#a0a0a0',
                    letterSpacing: '0.5px'
                  }}>
                    MAINNET NETWORKS
                  </p>
                  <div>
                    {mainnets.map(network => {
                      const isSelected = currentChainId === network.chainId || 
                        (!currentChainId && currentNetwork?.chainId === network.chainId);
                      
                      return (
                        <button
                          key={network.chainId}
                          onClick={() => handleNetworkSelect(network.chainId)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            marginBottom: '6px',
                            borderRadius: '6px',
                            border: isSelected ? '1px solid #3d5a73' : '1px solid #2e2e2e',
                            backgroundColor: isSelected ? '#1a2c3d' : '#262626',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.2s',
                            outline: 'none'
                          }}
                          onMouseOver={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#303030';
                          }}
                          onMouseOut={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#262626';
                          }}
                          disabled={isChangingNetwork}
                        >
                          <div style={{
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            <div style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              marginRight: '12px',
                              backgroundColor: '#28a745'
                            }}></div>
                            <div>
                              <div style={{
                                fontWeight: 500,
                                color: 'white',
                                fontSize: '14px'
                              }}>{network.name}</div>
                              <div className="text-sm text-gray-300">
                                {typeof network.currency === 'string' ? network.currency : network.currency.symbol}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M5 13L9 17L19 7" stroke="#90caf9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Testnet Networks */}
              {showTestnets && testnets.length > 0 && (
                <div style={{
                  padding: '10px 20px 5px 20px'
                }}>
                  <p style={{
                    margin: '0 0 8px 0',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: '#a0a0a0',
                    letterSpacing: '0.5px'
                  }}>
                    TESTNET NETWORKS
                  </p>
                  <div>
                    {testnets.map(network => {
                      const isSelected = currentChainId === network.chainId || 
                        (!currentChainId && currentNetwork?.chainId === network.chainId);
                      
                      return (
                        <button
                          key={network.chainId}
                          onClick={() => handleNetworkSelect(network.chainId)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            marginBottom: '6px',
                            borderRadius: '6px',
                            border: isSelected ? '1px solid #3d5a73' : '1px solid #2e2e2e',
                            backgroundColor: isSelected ? '#1a2c3d' : '#262626',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.2s',
                            outline: 'none'
                          }}
                          onMouseOver={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#303030';
                          }}
                          onMouseOut={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#262626';
                          }}
                          disabled={isChangingNetwork}
                        >
                          <div style={{
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            <div style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              marginRight: '12px',
                              backgroundColor: '#f0b90b'
                            }}></div>
                            <div>
                              <div style={{
                                fontWeight: 500,
                                color: 'white',
                                fontSize: '14px'
                              }}>{network.name}</div>
                              <div className="text-sm text-gray-300">
                                {typeof network.currency === 'string' ? network.currency : network.currency.symbol}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M5 13L9 17L19 7" stroke="#90caf9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* No Networks */}
              {configuredNetworks.length === 0 && (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center'
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto 12px auto', color: '#757575' }}>
                    <path d="M12 9V11M12 15H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0378 2.66667 10.268 4L3.33978 16C2.56998 17.3333 3.53223 19 5.07183 19Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p style={{
                    margin: '0 0 4px 0',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'white'
                  }}>No networks configured</p>
                  <p style={{
                    margin: 0,
                    fontSize: '12px',
                    color: '#a0a0a0'
                  }}>Add networks in the settings</p>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div style={{
              borderTop: '1px solid #2e2e2e',
              padding: '12px 20px',
              display: 'flex',
              justifyContent: 'flex-end',
              backgroundColor: '#262626'
            }}>
              <button
                onClick={handleCloseModal}
                style={{
                  backgroundColor: '#2e2e2e',
                  color: '#e0e0e0',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#383838'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2e2e2e'}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NetworkSelector; 