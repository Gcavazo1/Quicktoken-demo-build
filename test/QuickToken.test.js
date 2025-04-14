const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("QuickToken", function () {
  // Constants for token deployment
  const TOKEN_NAME = "Quick Token";
  const TOKEN_SYMBOL = "QUICK";
  const INITIAL_SUPPLY = ethers.parseEther("1000");
  const MAX_SUPPLY = ethers.parseEther("10000");
  const MINT_FEE_BPS = 200; // 2% in basis points
  const UNLOCK_TIME_DELTA = 86400; // 24 hours in seconds
  
  // Fixture to deploy the token before each test
  async function deployTokenFixture() {
    const [owner, user1, user2, platformFeeReceiver] = await ethers.getSigners();
    
    const currentTime = await time.latest();
    const unlockTime = currentTime + UNLOCK_TIME_DELTA;
    
    const QuickToken = await ethers.getContractFactory("QuickToken");
    const token = await QuickToken.deploy(
      TOKEN_NAME,
      TOKEN_SYMBOL,
      INITIAL_SUPPLY,
      MAX_SUPPLY,
      MINT_FEE_BPS,
      unlockTime,
      platformFeeReceiver.address
    );
    
    return { token, owner, user1, user2, platformFeeReceiver, unlockTime };
  }
  
  describe("Deployment", function () {
    it("Should set the right token name and symbol", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      
      expect(await token.name()).to.equal(TOKEN_NAME);
      expect(await token.symbol()).to.equal(TOKEN_SYMBOL);
    });
    
    it("Should assign the initial supply to the owner", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      
      expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
    });
    
    it("Should set the correct max supply", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      
      expect(await token.maxSupply()).to.equal(MAX_SUPPLY);
    });
    
    it("Should set the correct mint fee", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      
      expect(await token.mintFee()).to.equal(MINT_FEE_BPS);
    });
    
    it("Should set the correct unlock time", async function () {
      const { token, unlockTime } = await loadFixture(deployTokenFixture);
      
      expect(await token.unlockTime()).to.equal(unlockTime);
    });
    
    it("Should set the platform fee address", async function () {
      const { token, platformFeeReceiver } = await loadFixture(deployTokenFixture);
      
      expect(await token.platformFeeAddress()).to.equal(platformFeeReceiver.address);
    });
    
    it("Should revert if max supply is less than initial supply", async function () {
      const [owner, platformFeeReceiver] = await ethers.getSigners();
      const currentTime = await time.latest();
      const unlockTime = currentTime + UNLOCK_TIME_DELTA;
      
      const QuickToken = await ethers.getContractFactory("QuickToken");
      
      await expect(
        QuickToken.deploy(
          TOKEN_NAME,
          TOKEN_SYMBOL,
          ethers.parseEther("1000"),
          ethers.parseEther("500"), // Max supply less than initial
          MINT_FEE_BPS,
          unlockTime,
          platformFeeReceiver.address
        )
      ).to.be.revertedWith("Max supply must be >= initial supply");
    });
    
    it("Should revert if unlock time is in the past", async function () {
      const [owner, platformFeeReceiver] = await ethers.getSigners();
      const currentTime = await time.latest();
      const pastTime = currentTime - 100; // Time in the past
      
      const QuickToken = await ethers.getContractFactory("QuickToken");
      
      await expect(
        QuickToken.deploy(
          TOKEN_NAME,
          TOKEN_SYMBOL,
          INITIAL_SUPPLY,
          MAX_SUPPLY,
          MINT_FEE_BPS,
          pastTime,
          platformFeeReceiver.address
        )
      ).to.be.revertedWith("Unlock time must be in the future");
    });
    
    it("Should revert if platform fee address is zero", async function () {
      const [owner] = await ethers.getSigners();
      const currentTime = await time.latest();
      const unlockTime = currentTime + UNLOCK_TIME_DELTA;
      
      const QuickToken = await ethers.getContractFactory("QuickToken");
      
      await expect(
        QuickToken.deploy(
          TOKEN_NAME,
          TOKEN_SYMBOL,
          INITIAL_SUPPLY,
          MAX_SUPPLY,
          MINT_FEE_BPS,
          unlockTime,
          ethers.ZeroAddress
        )
      ).to.be.revertedWith("Platform fee address cannot be zero");
    });
  });
  
  describe("Time lock functionality", function () {
    it("Should prevent transfers before unlock time", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      
      await expect(
        token.connect(owner).transfer(user1.address, ethers.parseEther("100"))
      ).not.to.be.reverted; // Owner can transfer even when locked
      
      await expect(
        token.connect(user1).transfer(owner.address, ethers.parseEther("50"))
      ).to.be.revertedWith("Token transfers are locked until unlock time");
    });
    
    it("Should allow transfers after unlock time", async function () {
      const { token, owner, user1, unlockTime } = await loadFixture(deployTokenFixture);
      
      // Transfer from owner to user1 (owner can always transfer)
      await token.connect(owner).transfer(user1.address, ethers.parseEther("100"));
      
      // Fast forward time to after unlock
      await time.increaseTo(unlockTime + 1);
      
      // Now user1 should be able to transfer
      await expect(
        token.connect(user1).transfer(owner.address, ethers.parseEther("50"))
      ).not.to.be.reverted;
    });
    
    it("Should correctly report time until unlock", async function () {
      const { token, unlockTime } = await loadFixture(deployTokenFixture);
      
      const currentTime = await time.latest();
      const expectedTimeRemaining = unlockTime - currentTime;
      
      const reportedTimeRemaining = await token.getTimeUntilUnlock();
      
      // Allow a small margin of error (few seconds) due to block time variations
      expect(reportedTimeRemaining).to.be.closeTo(expectedTimeRemaining, 5);
      
      // Fast forward time to after unlock
      await time.increaseTo(unlockTime + 1);
      
      // Should report 0 time remaining
      expect(await token.getTimeUntilUnlock()).to.equal(0);
    });
  });
  
  describe("Minting functionality", function () {
    it("Should allow owner to mint new tokens", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      
      const mintAmount = ethers.parseEther("500");
      const fee = await token.calculateMintFee(mintAmount);
      
      await expect(
        token.connect(owner).mint(user1.address, mintAmount, { value: fee })
      ).to.changeTokenBalance(token, user1, mintAmount);
      
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY + mintAmount);
    });
    
    it("Should revert if non-owner tries to mint", async function () {
      const { token, user1 } = await loadFixture(deployTokenFixture);
      
      const mintAmount = ethers.parseEther("500");
      const fee = await token.calculateMintFee(mintAmount);
      
      await expect(
        token.connect(user1).mint(user1.address, mintAmount, { value: fee })
      ).to.be.reverted;
    });
    
    it("Should revert if mint would exceed max supply", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      
      const excessAmount = MAX_SUPPLY - INITIAL_SUPPLY + ethers.parseEther("1");
      const fee = await token.calculateMintFee(excessAmount);
      
      await expect(
        token.connect(owner).mint(owner.address, excessAmount, { value: fee })
      ).to.be.revertedWith("Exceeds max supply limit");
    });
    
    it("Should revert if insufficient fee is provided", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      
      const mintAmount = ethers.parseEther("500");
      const correctFee = await token.calculateMintFee(mintAmount);
      const insufficientFee = correctFee - ethers.parseEther("0.001");
      
      await expect(
        token.connect(owner).mint(user1.address, mintAmount, { value: insufficientFee })
      ).to.be.revertedWith("Insufficient fee");
    });
    
    it("Should correctly calculate mint fee", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      
      const tokenAmount = ethers.parseEther("1000");
      const expectedFee = (tokenAmount * BigInt(MINT_FEE_BPS)) / BigInt(10000);
      
      expect(await token.calculateMintFee(tokenAmount)).to.equal(expectedFee);
    });
    
    it("Should distribute fees correctly between owner and platform", async function () {
      const { token, owner, user1, platformFeeReceiver } = await loadFixture(deployTokenFixture);
      
      const mintAmount = ethers.parseEther("1000");
      const totalFee = await token.calculateMintFee(mintAmount);
      
      const [ownerFee, platformFee] = await token.calculateFeeDistribution(totalFee);
      
      // Check that platform gets 20% and owner gets 80%
      expect(platformFee).to.equal((totalFee * BigInt(2000)) / BigInt(10000));
      expect(ownerFee).to.equal(totalFee - platformFee);
      
      // Track platform balance before mint
      const platformBalanceBefore = await ethers.provider.getBalance(platformFeeReceiver.address);
      
      // Mint from owner (fees will be distributed)
      await token.connect(owner).mint(user1.address, mintAmount, { value: totalFee });
      
      // Check platform balance after mint
      const platformBalanceAfter = await ethers.provider.getBalance(platformFeeReceiver.address);
      
      // Platform should have received platform fee
      expect(platformBalanceAfter).to.equal(platformBalanceBefore + platformFee);
      
      // Also verify that tokens were minted to the right account
      expect(await token.balanceOf(user1.address)).to.equal(mintAmount);
    });
    
    it("Should refund excess payment", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      
      const mintAmount = ethers.parseEther("500");
      const fee = await token.calculateMintFee(mintAmount);
      const excess = ethers.parseEther("1");
      
      const balanceBefore = await ethers.provider.getBalance(owner.address);
      
      const tx = await token.connect(owner).mint(
        user1.address, 
        mintAmount, 
        { value: fee + excess }
      );
      
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const balanceAfter = await ethers.provider.getBalance(owner.address);
      
      // Owner should have spent: gas + fee (not fee + excess)
      expect(balanceAfter).to.be.closeTo(
        balanceBefore - fee - gasUsed,
        ethers.parseEther("0.00001") // Small margin for rounding
      );
    });
    
    it("Should emit FeesDistributed event", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      
      const mintAmount = ethers.parseEther("500");
      const totalFee = await token.calculateMintFee(mintAmount);
      const [ownerFee, platformFee] = await token.calculateFeeDistribution(totalFee);
      
      await expect(token.connect(owner).mint(user1.address, mintAmount, { value: totalFee }))
        .to.emit(token, "FeesDistributed")
        .withArgs(ownerFee, platformFee);
    });
  });
  
  describe("Burning functionality", function () {
    it("Should allow owner to burn their tokens", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      
      const burnAmount = ethers.parseEther("100");
      
      await expect(token.connect(owner).burn(burnAmount))
        .to.changeTokenBalance(token, owner, -burnAmount);
        
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY - burnAmount);
    });
    
    it("Should allow owner to burn from other accounts", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      
      // First transfer tokens to user1
      const transferAmount = ethers.parseEther("200");
      await token.connect(owner).transfer(user1.address, transferAmount);
      
      // User1 approves owner to spend tokens
      const burnAmount = ethers.parseEther("100");
      await token.connect(user1).approve(owner.address, burnAmount);
      
      // Owner burns from user1
      await expect(token.connect(owner).burnFrom(user1.address, burnAmount))
        .to.changeTokenBalance(token, user1, -burnAmount);
        
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY - burnAmount);
    });
    
    it("Should revert if non-owner tries to burn", async function () {
      const { token, user1 } = await loadFixture(deployTokenFixture);
      
      await expect(token.connect(user1).burn(ethers.parseEther("100")))
        .to.be.reverted;
    });
  });
  
  describe("Pause functionality", function () {
    it("Should allow owner to pause and unpause", async function () {
      const { token, owner, user1, unlockTime } = await loadFixture(deployTokenFixture);
      
      // Fast forward time past unlock
      await time.increaseTo(unlockTime + 1);
      
      // Transfer some tokens to user1
      await token.connect(owner).transfer(user1.address, ethers.parseEther("100"));
      
      // Owner pauses the contract
      await token.connect(owner).pause();
      
      // Transfers should be reverted while paused
      await expect(
        token.connect(user1).transfer(owner.address, ethers.parseEther("50"))
      ).to.be.reverted;
      
      // Owner unpauses the contract
      await token.connect(owner).unpause();
      
      // Transfers should work again
      await expect(
        token.connect(user1).transfer(owner.address, ethers.parseEther("50"))
      ).not.to.be.reverted;
    });
    
    it("Should revert if non-owner tries to pause", async function () {
      const { token, user1 } = await loadFixture(deployTokenFixture);
      
      await expect(token.connect(user1).pause()).to.be.reverted;
    });
  });
  
  describe("Platform fee functionality", function () {
    it("Should allow owner to update platform fee address", async function () {
      const { token, owner, user2 } = await loadFixture(deployTokenFixture);
      
      await expect(token.connect(owner).updatePlatformAddress(user2.address))
        .to.emit(token, "PlatformFeeUpdated")
        .withArgs(await token.platformFeeAddress(), user2.address);
        
      expect(await token.platformFeeAddress()).to.equal(user2.address);
    });
    
    it("Should revert if non-owner tries to update platform fee address", async function () {
      const { token, user1, user2 } = await loadFixture(deployTokenFixture);
      
      await expect(token.connect(user1).updatePlatformAddress(user2.address))
        .to.be.reverted;
    });
    
    it("Should revert if platform fee address is set to zero", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      
      await expect(token.connect(owner).updatePlatformAddress(ethers.ZeroAddress))
        .to.be.revertedWith("Platform fee address cannot be zero");
    });
  });
}); 