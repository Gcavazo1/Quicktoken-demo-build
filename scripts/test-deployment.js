// Test script to verify deployment process
const { main } = require('./deploy');
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function testDeployment() {
  console.log('Starting deployment test...');
  console.log(`Network: ${hre.network.name}`);
  
  try {
    // Get current ethers version 
    console.log(`Ethers.js version: ${ethers.version || 'unknown'}`);
    
    // Verify we can get signers with ethers v6
    const [deployer] = await ethers.getSigners();
    console.log('Test 1: Get signer - PASSED');
    
    // Verify we can get balance with ethers v6
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`Test 2: Get balance (${ethers.formatEther(balance)} ETH) - PASSED`);
    
    // Verify we can get fee data with ethers v6
    const feeData = await ethers.provider.getFeeData();
    console.log(`Test 3: Get fee data - PASSED (Gas Price: ${feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') + ' gwei' : 'N/A'})`);
    
    // Mock deployment data for testing
    console.log('\nTesting local mock deployment...');
    const mockDeploymentData = {
      contractAddress: '0x0000000000000000000000000000000000000000',
      tokenName: 'TestToken',
      tokenSymbol: 'TST',
      initialSupply: ethers.parseEther('1000000'),
      maxSupply: ethers.parseEther('10000000'),
      mintFeeBps: 200,
      unlockTime: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 1 day from now
      platformFeeAddress: deployer.address
    };
    
    console.log('Mock deployment data created - PASSED');
    
    // Full deployment test
    console.log('\nRunning full deployment test...');
    const deploymentResult = await main();
    
    console.log('\nDeployment test completed:');
    console.log(JSON.stringify(deploymentResult, null, 2));
    
    return { success: true, deploymentInfo: deploymentResult };
  } catch (error) {
    console.error('Deployment test failed:');
    console.error(error);
    return { success: false, error: error.message };
  }
}

// Run test if script is executed directly
if (require.main === module) {
  testDeployment()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { testDeployment }; 