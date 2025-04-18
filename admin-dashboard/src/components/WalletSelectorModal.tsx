import React from 'react';
// import { EIP6963ProviderDetail } from '../services/WalletConnector'; // Adjust path as needed
import { EIP6963ProviderDetail, EIP6963ProviderInfo } from '../services/WalletConnector'; // Add EIP6963ProviderInfo
// import { Button } from './Button'; // Using custom styled button for close
import { X } from 'lucide-react'; // Keep X icon if desired for close

interface WalletSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: EIP6963ProviderDetail[];
  onConnect: (provider: EIP6963ProviderDetail) => void;
  isLoading?: boolean;
}

// Helper to get appropriate icon (EIP-6963 or fallback PNG)
const getWalletIcon = (providerInfo: EIP6963ProviderInfo): string => {
  // Prioritize specific RDNS matches for custom icons
  if (providerInfo.rdns === 'io.metamask') {
    return '/images/metamask-logo.png';
  }
  if (providerInfo.rdns === 'com.coinbase.wallet') {
    return '/images/coinbase-logo.png';
  }

  // If no RDNS match, try to use the provided icon if it seems valid
  const isValidIcon = providerInfo.icon && (providerInfo.icon.startsWith('data:image') || /\.(svg|png|jpe?g|webp)$/i.test(providerInfo.icon));
  if (isValidIcon) {
    return providerInfo.icon;
  }
  
  // Final fallback: return original icon or a default placeholder
  // return '/images/default-wallet.png'; // Example placeholder
  return providerInfo.icon; // Return original icon data even if it might not render
};

const WalletSelectorModal: React.FC<WalletSelectorModalProps> = ({ 
  isOpen,
  onClose,
  providers,
  onConnect,
  isLoading 
}) => {
  if (!isOpen) return null;

  // Determine theme (basic detection, assumes parent sets data-theme or class)
  const isDarkMode = typeof document !== 'undefined' && 
                      (document.documentElement.classList.contains('dark') || 
                       document.documentElement.getAttribute('data-theme') === 'dark');

  const modalBgColor = isDarkMode ? '#1e1e1e' : '#ffffff';
  const modalBorderColor = isDarkMode ? '#3a3a3a' : '#e5e7eb'; // Adjusted light border
  const headerBgColor = isDarkMode ? '#262626' : '#f9fafb'; // Light header
  const textColor = isDarkMode ? '#e5e7eb' : '#1f2937'; // Light text
  const secondaryTextColor = isDarkMode ? '#9ca3af' : '#6b7280';
  const hoverBgColor = isDarkMode ? '#303030' : '#f3f4f6';
  const itemBgColor = isDarkMode ? '#2a2a2a' : '#ffffff'; // Slightly different item bg in light

  return (
    <div 
      // Overlay: Use Tailwind for simplicity
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4"
      onClick={onClose} // Close modal on overlay click
    >
      <div 
        // Modal container: Inline styles based on NetworkSelector
        style={{
          backgroundColor: modalBgColor,
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.7)',
          width: '100%',
          maxWidth: '380px',
          overflow: 'hidden',
          position: 'relative',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          border: `1px solid ${modalBorderColor}`
        }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        {/* Modal Header */}
        <div style={{
          borderBottom: `1px solid ${modalBorderColor}`,
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: headerBgColor
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 600,
            color: textColor
          }}>
            Select Wallet
          </h3>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: secondaryTextColor,
              transition: 'color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = textColor}
            onMouseOut={(e) => e.currentTarget.style.color = secondaryTextColor}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div 
          // Use Tailwind for padding and scrollbar styling (optional)
          className="p-5 overflow-y-auto"
          style={{ flexGrow: 1 }} // Ensure body takes available space
        >
          {providers.length === 0 ? (
            <p 
              className="text-center py-4"
              style={{ color: secondaryTextColor }}
            >
              {isLoading ? 'Discovering wallets...' : 'No wallet providers detected. Please install a wallet extension.'}
            </p>
          ) : (
            <div className="space-y-3">
              {providers.map((providerDetail) => (
                <button
                  key={providerDetail.info.uuid} // Use UUID as key
                  onClick={() => onConnect(providerDetail)}
                  disabled={isLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: '10px 16px', // Adjust padding if needed
                    borderRadius: '6px',
                    border: `1px solid ${modalBorderColor}`,
                    backgroundColor: itemBgColor,
                    textAlign: 'left',
                    cursor: isLoading ? 'wait' : 'pointer',
                    transition: 'background-color 0.2s, border-color 0.2s',
                    opacity: isLoading ? 0.7 : 1
                  }}
                  onMouseOver={(e) => !isLoading && (e.currentTarget.style.backgroundColor = hoverBgColor)}
                  onMouseOut={(e) => !isLoading && (e.currentTarget.style.backgroundColor = itemBgColor)}
                >
                  <img 
                    src={getWalletIcon(providerDetail.info)} 
                    alt={`${providerDetail.info.name} logo`}
                    style={{ 
                      height: '32px', // Increase height
                      width: 'auto', // Let width adjust based on height for PNGs
                      maxWidth: '150px', // Max width for potentially wide logos
                      margin: 'auto', // Center the image horizontally
                      borderRadius: '4px', 
                      objectFit: 'contain' 
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletSelectorModal; 