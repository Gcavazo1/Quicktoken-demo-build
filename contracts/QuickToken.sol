// SPDX-License-Identifier: UNLICENSED
// QuickToken Platform - Proprietary License
// Copyright (c) 2023-2024 GigaCode (Gabriel Cavazos). All rights reserved.
// This code is licensed under a proprietary license. See LICENSE file for details.
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title QuickToken
 * @dev ERC20 token with burning, minting, pausing and time-lock capabilities.
 * Includes mint fee calculation and distribution between platform and owner.
 */
contract QuickToken is ERC20, ERC20Burnable, Ownable {
    using Math for uint256;

    // Token configuration
    uint256 public immutable maxSupply;
    uint256 public immutable mintFee; // Fee in basis points (1/100 of a percent), e.g., 100 = 1%
    uint256 public immutable unlockTime; // Timestamp when transfers become available

    // Platform fee configuration
    address public platformFeeAddress;
    uint256 public platformFeePercentage; // Percentage in basis points (e.g., 2000 = 20%)
    
    // Token status
    bool private _paused;
    
    // Events
    event PlatformFeeUpdated(address indexed previousAddress, address indexed newAddress);
    event FeesDistributed(uint256 ownerAmount, uint256 platformAmount);
    event Paused(address account);
    event Unpaused(address account);

    /**
     * @dev Modifier to make a function callable only when the contract is not paused.
     */
    modifier whenNotPaused() {
        require(!_paused, "Token transfers are paused");
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused.
     */
    modifier whenPaused() {
        require(_paused, "Token transfers are not paused");
        _;
    }

    /**
     * @dev Constructor that initializes the token with name, symbol, initial supply and parameters
     * @param name_ Name of the token
     * @param symbol_ Symbol of the token
     * @param initialSupply Initial amount to mint to the contract creator
     * @param maxSupply_ Maximum allowed supply
     * @param mintFee_ Fee charged when minting tokens (in basis points)
     * @param unlockTime_ Timestamp when transfers become available
     * @param platformFeeAddress_ Address that receives a portion of mint fees
     * @param platformFeePercentage_ Percentage in basis points (e.g., 2000 = 20%)
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply,
        uint256 maxSupply_,
        uint256 mintFee_,
        uint256 unlockTime_,
        address platformFeeAddress_,
        uint256 platformFeePercentage_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        require(maxSupply_ >= initialSupply, "Max supply must be >= initial supply");
        require(platformFeeAddress_ != address(0), "Platform fee address cannot be zero");
        require(unlockTime_ > block.timestamp, "Unlock time must be in the future");
        require(platformFeePercentage_ <= 10000, "Platform fee cannot exceed 100%");
        
        maxSupply = maxSupply_;
        mintFee = mintFee_;
        unlockTime = unlockTime_;
        platformFeeAddress = platformFeeAddress_;
        platformFeePercentage = platformFeePercentage_;
        _paused = false;
        
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply);
        }
    }

    /**
     * @dev Calculates the mint fee for a given amount
     * @param amount Amount of tokens to mint
     * @return The fee amount in native currency (ETH)
     */
    function calculateMintFee(uint256 amount) public view returns (uint256) {
        return (amount * mintFee) / 10000;
    }

    /**
     * @dev Calculate how the mint fee will be distributed
     * @param feeAmount The total fee amount
     * @return ownerFee Amount that goes to the token owner
     * @return platformFee Amount that goes to the platform
     */
    function calculateFeeDistribution(uint256 feeAmount) public view returns (uint256 ownerFee, uint256 platformFee) {
        platformFee = (feeAmount * platformFeePercentage) / 10000;
        ownerFee = feeAmount - platformFee;
        return (ownerFee, platformFee);
    }

    /**
     * @dev Time remaining until token transfers are unlocked
     * @return Time in seconds until unlock, 0 if already unlocked
     */
    function getTimeUntilUnlock() public view returns (uint256) {
        if (block.timestamp >= unlockTime) {
            return 0;
        }
        return unlockTime - block.timestamp;
    }
    
    /**
     * @dev Returns true if the token is paused, and false otherwise.
     */
    function paused() public view virtual returns (bool) {
        return _paused;
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(msg.sender);
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(msg.sender);
    }

    /**
     * @dev Override _update function to implement time lock
     */
    function _update(address from, address to, uint256 amount) internal virtual override whenNotPaused {
        // Allow minting and burning operations regardless of unlock time
        if (from == address(0) || to == address(0)) {
            super._update(from, to, amount);
            return;
        }
        
        // Allow transfers after unlock time or if the sender is the owner
        if (block.timestamp >= unlockTime || from == owner()) {
            super._update(from, to, amount);
        } else {
            revert("Token transfers are locked until unlock time");
        }
    }

    /**
     * @dev Mints new tokens, requires payment of mint fee
     * @param to Address receiving the minted tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) public payable onlyOwner {
        require(totalSupply() + amount <= maxSupply, "Exceeds max supply limit");
        
        uint256 feeAmount = calculateMintFee(amount);
        require(msg.value >= feeAmount, "Insufficient fee");
        
        // Distribute fees
        if (feeAmount > 0) {
            (uint256 ownerFee, uint256 platformFee) = calculateFeeDistribution(feeAmount);
            
            if (platformFee > 0) {
                (bool platformSuccess, ) = platformFeeAddress.call{value: platformFee}("");
                require(platformSuccess, "Platform fee transfer failed");
            }
            
            if (ownerFee > 0 && owner() != msg.sender) {
                (bool ownerSuccess, ) = owner().call{value: ownerFee}("");
                require(ownerSuccess, "Owner fee transfer failed");
            }
            
            emit FeesDistributed(ownerFee, platformFee);
        }
        
        // Refund excess payment
        if (msg.value > feeAmount) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - feeAmount}("");
            require(refundSuccess, "Refund failed");
        }
        
        _mint(to, amount);
    }

    /**
     * @dev Burns tokens from the caller
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) public override {
        _burn(_msgSender(), amount);
    }

    /**
     * @dev Burns tokens from a specific account (requires approval)
     * @param account Address to burn from
     * @param amount Amount of tokens to burn
     */
    function burnFrom(address account, uint256 amount) public override {
        super.burnFrom(account, amount);
    }

    /**
     * @dev Pauses all token transfers
     */
    function pause() public onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses all token transfers
     */
    function unpause() public onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Update the platform fee address
     * @param newPlatformFeeAddress New address to receive platform fees
     */
    function updatePlatformAddress(address newPlatformFeeAddress) public onlyOwner {
        require(newPlatformFeeAddress != address(0), "Platform fee address cannot be zero");
        emit PlatformFeeUpdated(platformFeeAddress, newPlatformFeeAddress);
        platformFeeAddress = newPlatformFeeAddress;
    }
    
    /**
     * @dev Fallback function to accept ETH payments for fees
     */
    receive() external payable {
        // Accept ETH payments for mint fees
    }
} 