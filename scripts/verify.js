/**
 * @title QuickToken Verification Script
 * @description Script to verify the QuickToken contract on block explorers
 * 
 * Run with: npx hardhat run scripts/verify.js --network <network>
 */

const fs = require("fs");
const path = require("path");
const { task } = require("hardhat/config");
const { network } = require("hardhat");

/**
 * Read deployment data from JSON file
 * @returns {object} Deployment details
 */
function readDeploymentData() {
  try {
    const deploymentsDir = path.join(__dirname, "../deployments");
    const deploymentFile = path.join(deploymentsDir, `${network.name}-deployment.json`);
    
    if (!fs.existsSync(deploymentFile)) {
      console.error(`Deployment file not found: ${deploymentFile}`);
      console.error(`Please run deploy.js first on network: ${network.name}`);
      process.exit(1);
    }
    
    const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    return deploymentData;
  } catch (error) {
    console.error(`Error reading deployment data: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Verify contract on block explorer
 * @param {object} hre Hardhat runtime environment
 * @param {object} deploymentData Deployment data
 */
async function verifyContract(hre, deploymentData) {
  const { contractAddress, tokenName, tokenSymbol, initialSupply, maxSupply, mintFeeBps, unlockTime, platformFeeAddress } = deploymentData;
  
  // console.log("----------------------------------------------------");
  // console.log("🔍 Verifying QuickToken Contract");
  // console.log("----------------------------------------------------");
  // console.log(`Network:            ${network.name}`);
  // console.log(`Contract Address:   ${contractAddress}`);
  // console.log(`Token Name:         ${tokenName}`);
  // console.log(`Token Symbol:       ${tokenSymbol}`);
  // console.log(`Initial Supply:     ${initialSupply}`);
  // console.log(`Max Supply:         ${maxSupply}`);
  // console.log(`Mint Fee (BPS):     ${mintFeeBps}`);
  // console.log(`Unlock Time:        ${new Date(unlockTime * 1000).toISOString()}`);
  // console.log(`Platform Fee Addr:  ${platformFeeAddress}`);
  // console.log("----------------------------------------------------");
  
  try {
    // Verify the contract
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [
        tokenName,
        tokenSymbol,
        hre.ethers.parseEther(initialSupply),
        hre.ethers.parseEther(maxSupply),
        mintFeeBps,
        unlockTime,
        platformFeeAddress
      ],
    });
    
    // Success - show block explorer links
    // console.log("✅ Contract verified successfully!");
    // console.log("----------------------------------------------------");
    // console.log("🔗 Block Explorer Links:");
    
    let explorerUrl = "";
    if (network.name === "mainnet") {
      explorerUrl = `https://etherscan.io/token/${contractAddress}`;
    } else if (network.name === "sepolia") {
      explorerUrl = `https://sepolia.etherscan.io/token/${contractAddress}`;
    } else if (network.name === "goerli") {
      explorerUrl = `https://goerli.etherscan.io/token/${contractAddress}`;
    } else if (network.name === "polygon") {
      explorerUrl = `https://polygonscan.com/token/${contractAddress}`;
    } else if (network.name === "polygonMumbai") {
      explorerUrl = `https://mumbai.polygonscan.com/token/${contractAddress}`;
    } else if (network.name === "optimism") {
      explorerUrl = `https://optimistic.etherscan.io/token/${contractAddress}`;
    } else if (network.name === "arbitrum") {
      explorerUrl = `https://arbiscan.io/token/${contractAddress}`;
    } else if (network.name === "avalanche") {
      explorerUrl = `https://snowtrace.io/token/${contractAddress}`;
    } else {
      explorerUrl = `https://etherscan.io/token/${contractAddress}`;
    }
    
    // console.log(explorerUrl);
    // console.log("----------------------------------------------------");
    
  } catch (error) {
    // Handle verification errors
    if (error.message.includes("Already Verified")) {
      // console.log("✅ Contract already verified");
    } else if (error.message.includes("Pending")) {
      // console.log("⏳ Verification pending. Please check the block explorer.");
    } else if (error.message.includes("matching bytecode")) {
      console.error("❌ Verification failed: Bytecode does not match.");
      console.error("Possible causes:");
      console.error("1. Contract was compiled with different settings");
      console.error("2. Constructor arguments are incorrect");
      console.error("3. Wrong contract address provided");
    } else if (error.message.includes('already verified')) {
      // console.log("✅ Contract already verified");
    } else if (error.message.includes('does not have bytecode') || error.message.includes('has no bytecode')){
      // console.log("⏳ Verification pending. Please check the block explorer.");
    } else {
      console.error("❌ Verification failed:", error);
    }
  } finally {
    // console.log("----------------------------------------------------");
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Read deployment data
    const deploymentData = readDeploymentData();
    if (!deploymentData || !deploymentData.contractAddress) {
      console.error("No deployment data found. Please deploy the contract first.");
      process.exit(1);
    }
    
    // Verify contract
    await verifyContract(hre, deploymentData);
  } catch (error) {
    console.error("Error during verification:", error.message);
    process.exit(1);
  }
}

// Run main function if script is executed directly
if (require.main === module) {
  const hre = require("hardhat");
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { verifyContract, readDeploymentData }; 