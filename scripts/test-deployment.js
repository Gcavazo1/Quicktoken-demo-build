// Test script to verify deployment process
const { main } = require('./deploy');
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  // console.log('Starting deployment test...');
  // console.log(`Network: ${hre.network.name}`);

  try {
    // Test 1: Get Signer
    const [deployer] = await ethers.getSigners();
    if (!deployer) throw new Error("Failed to get signer");
    // console.log(`Ethers.js version: ${ethers.version || 'unknown'}`); // Log Ethers version
    // console.log('Test 1: Get signer - PASSED');

    // Test 2: Get Balance
    const balance = await ethers.provider.getBalance(deployer.address);
    if (balance === undefined) throw new Error("Failed to get balance");
    // console.log(`Test 2: Get balance (${ethers.formatEther(balance)} ETH) - PASSED`);

    // Test 3: Get Fee Data
    const feeData = await ethers.provider.getFeeData();
    if (!feeData) throw new Error("Failed to get fee data");
    // console.log(`Test 3: Get fee data - PASSED (Gas Price: ${feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') + ' gwei' : 'N/A'})`);

    // console.log('\nTesting local mock deployment...');
    // Test 4: Mock Deployment Logic (assuming deploy.js can be required)
    const mockDeploy = require('./deploy-mock'); // Adjust path if needed
    const mockConfig = {
        name: "Mock QuickToken",
        symbol: "MQTK",
        initialSupply: "1000000",
        maxSupply: "10000000",
        mintFeeBps: 50, // 0.5%
        unlockTime: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        platformFeeAddress: deployer.address // Use deployer for mock
    };
    const mockDeploymentData = await mockDeploy(mockConfig, { save: false, verify: false }); // Don't save or verify
    if (!mockDeploymentData || !mockDeploymentData.contractAddress) throw new Error("Mock deployment failed");
    // console.log('Mock deployment data created - PASSED');

    // console.log('\nRunning full deployment test...');
    // Test 5: Full Deployment (import and run deploy.js main logic)
    const deployScript = require('./deploy'); // Assuming deploy.js exports main or a deploy function
    const deploymentResult = await deployScript.main({ // Pass mock config, specify no save/verify
        configOverrides: mockConfig,
        saveDeploymentInfo: false,
        verifyContract: false
    });
    // console.log('\nDeployment test completed:');
    // console.log(JSON.stringify(deploymentResult, null, 2));

    console.log("\n✅ All deployment tests passed successfully!");

  } catch (error) {
    console.error("\n❌ Deployment test failed:", error);
    process.exit(1);
  }
}

// Run test if script is executed directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main }; 