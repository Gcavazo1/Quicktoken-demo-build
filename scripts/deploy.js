/**
 * @title QuickToken Deployment Script
 * @description Script to deploy the QuickToken ERC-20 contract
 * 
 * Run with: npx hardhat run scripts/deploy.js --network <network>
 * 
 * Configuration options:
 * 1. CLI arguments: --name "Token Name" --symbol TKN ...
 * 2. Config file: --config path/to/config.json
 * 3. Environment variables: QUICKTOKEN_NAME, QUICKTOKEN_SYMBOL...
 * 4. Default values (defined in DEFAULT_CONFIG)
 */

const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Default configuration for QuickToken
const DEFAULT_CONFIG = {
  name: "QuickToken",
  symbol: "QTK",
  initialSupply: "1000000", // 1 million tokens
  maxSupply: "10000000", // 10 million tokens
  mintFeeBps: 250, // 2.5% (basis points)
  unlockTime: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
  platformFeeAddress: "0x0000000000000000000000000000000000000000" // Zero address by default
};

/**
 * Parse command line arguments
 * @returns {object} Configuration from CLI args
 */
function parseCliArgs() {
  const args = process.argv.slice(2);
  const config = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === "--config") {
      // Config file path provided, return empty object as this will be handled separately
      config.configFile = args[i + 1];
      i++;
    } else if (arg === "--name" && i + 1 < args.length) {
      config.name = args[i + 1];
      i++;
    } else if (arg === "--symbol" && i + 1 < args.length) {
      config.symbol = args[i + 1];
      i++;
    } else if (arg === "--initial-supply" && i + 1 < args.length) {
      config.initialSupply = args[i + 1];
      i++;
    } else if (arg === "--max-supply" && i + 1 < args.length) {
      config.maxSupply = args[i + 1];
      i++;
    } else if (arg === "--mint-fee" && i + 1 < args.length) {
      config.mintFeeBps = parseInt(args[i + 1]);
      i++;
    } else if (arg === "--unlock-time" && i + 1 < args.length) {
      config.unlockTime = parseInt(args[i + 1]);
      i++;
    } else if (arg === "--platform-address" && i + 1 < args.length) {
      config.platformFeeAddress = args[i + 1];
      i++;
    } else if (arg === "--save" && i + 1 < args.length) {
      config.savePath = args[i + 1];
      i++;
    }
  }
  
  return config;
}

/**
 * Load configuration from a file
 * @param {string} filePath Path to configuration file
 * @returns {object} Configuration from file
 */
function loadConfigFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`Configuration file not found: ${filePath}`);
      return {};
    }
    
    const fileData = fs.readFileSync(filePath, "utf8");
    return JSON.parse(fileData);
  } catch (error) {
    console.error(`Error loading configuration file: ${error.message}`);
    return {};
  }
}

/**
 * Get configuration from environment variables
 * @returns {object} Configuration from environment variables
 */
function getEnvConfig() {
  const config = {};
  
  if (process.env.QUICKTOKEN_NAME) config.name = process.env.QUICKTOKEN_NAME;
  if (process.env.QUICKTOKEN_SYMBOL) config.symbol = process.env.QUICKTOKEN_SYMBOL;
  if (process.env.QUICKTOKEN_INITIAL_SUPPLY) config.initialSupply = process.env.QUICKTOKEN_INITIAL_SUPPLY;
  if (process.env.QUICKTOKEN_MAX_SUPPLY) config.maxSupply = process.env.QUICKTOKEN_MAX_SUPPLY;
  if (process.env.QUICKTOKEN_MINT_FEE_BPS) config.mintFeeBps = parseInt(process.env.QUICKTOKEN_MINT_FEE_BPS);
  
  // Support both direct unlock time and lock duration
  if (process.env.QUICKTOKEN_UNLOCK_TIME) {
    config.unlockTime = parseInt(process.env.QUICKTOKEN_UNLOCK_TIME);
  } else if (process.env.QUICKTOKEN_LOCK_DURATION_SECONDS) {
    config.unlockTime = Math.floor(Date.now() / 1000) + parseInt(process.env.QUICKTOKEN_LOCK_DURATION_SECONDS);
  }
  
  if (process.env.QUICKTOKEN_PLATFORM_FEE_ADDRESS) {
    config.platformFeeAddress = process.env.QUICKTOKEN_PLATFORM_FEE_ADDRESS;
  }
  
  return config;
}

/**
 * Get deployment configuration with correct priority:
 * 1. CLI args > 2. Config file > 3. Environment variables > 4. Default values
 * @returns {object} Final deployment configuration
 */
function getDeployConfig() {
  const cliConfig = parseCliArgs();
  
  // Load file config if specified
  const fileConfig = cliConfig.configFile 
    ? loadConfigFile(cliConfig.configFile) 
    : {};
  
  // Load environment variables config
  const envConfig = getEnvConfig();
  
  // Combine configurations with proper priority
  return {
    ...DEFAULT_CONFIG,
    ...envConfig,
    ...fileConfig,
    ...cliConfig
  };
}

/**
 * Save deployment information to file
 * @param {object} deploymentInfo Deployment information to save
 * @param {string} customPath Optional custom path to save to
 */
function saveDeploymentInfo(deploymentInfo, customPath) {
  try {
    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    const filePath = customPath || path.join(deploymentsDir, `${deploymentInfo.network}-deployment.json`);
    
    // Save deployment info to file
    fs.writeFileSync(
      filePath,
      JSON.stringify(deploymentInfo, null, 2),
      "utf8"
    );
    
    // console.log(`Deployment information saved to: ${filePath}`);
  } catch (error) {
    console.error(`Failed to save deployment information: ${error.message}`);
  }
}

/**
 * Deploy the QuickToken contract
 * @param {object} config Deployment configuration
 */
async function deploy(config) {
  // Convert string values to appropriate format for contract
  const initialSupply = ethers.parseEther(config.initialSupply.toString());
  const maxSupply = ethers.parseEther(config.maxSupply.toString());
  
  // Print deployment parameters
  // console.log("----------------------------------------------------");
  // console.log("🚀 Deploying QuickToken Contract");
  // console.log("----------------------------------------------------");
  // console.log(`Network:          ${network.name}`);
  // console.log(`Token Name:       ${config.name}`);
  // console.log(`Token Symbol:     ${config.symbol}`);
  // console.log(`Initial Supply:   ${config.initialSupply} tokens`);
  // console.log(`Max Supply:       ${config.maxSupply} tokens`);
  // console.log(`Mint Fee (BPS):   ${config.mintFeeBps} (${config.mintFeeBps/100}%)`);
  // console.log(`Unlock Time:      ${new Date(config.unlockTime * 1000).toISOString()}`);
  // console.log(`Platform Address: ${config.platformFeeAddress}`);
  // console.log("----------------------------------------------------");

    // Get the contract factory
  const QuickToken = await ethers.getContractFactory("QuickToken");
    
  // Deploy the contract
    // console.log("Deploying contract...");
  const deployer = await ethers.provider.getSigner();
  const deployerAddress = await deployer.getAddress();
  // console.log(`Deployer account: ${deployerAddress}`);
  
  const quickToken = await QuickToken.deploy(
    config.name,
    config.symbol,
    initialSupply,
      maxSupply,
    config.mintFeeBps,
    config.unlockTime,
    config.platformFeeAddress
    );
    
    // Wait for deployment to finish
    await quickToken.waitForDeployment();
    const contractAddress = await quickToken.getAddress();
    
  // console.log("----------------------------------------------------");
  // console.log(`✅ QuickToken deployed to: ${contractAddress}`);
  // console.log("----------------------------------------------------");
  
  // Build deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    deployer: deployerAddress,
    contractAddress: contractAddress,
    deploymentTime: Math.floor(Date.now() / 1000),
    tokenName: config.name,
    tokenSymbol: config.symbol,
    initialSupply: config.initialSupply,
    maxSupply: config.maxSupply,
    mintFeeBps: config.mintFeeBps,
    unlockTime: config.unlockTime,
    platformFeeAddress: config.platformFeeAddress
  };
  
  // Save deployment info if configured to do so
  if (config.savePath !== false) {
    saveDeploymentInfo(deploymentInfo, config.savePath);
  }
  
  return { contract: quickToken, deploymentInfo };
}

/**
 * Main function
 */
async function main() {
  try {
    // Get deployment configuration
    const config = getDeployConfig();
    
    // Deploy the contract
    const { contract, deploymentInfo } = await deploy(config);
    
    // Show success message
    // console.log("🎉 Deployment successful!");
    // console.log(`Use 'npx hardhat verify --network ${network.name} ${deploymentInfo.contractAddress} "${config.name}" "${config.symbol}" "${config.initialSupply}" "${config.maxSupply}" ${config.mintFeeBps} ${config.unlockTime} "${config.platformFeeAddress}"' to verify on Etherscan`);
    // console.log("Or simply run: npx hardhat run scripts/verify.js --network " + network.name);
    
    return { contract, deploymentInfo };
  } catch (error) {
    // console.error("----------------------------------------------------");
    // console.error("❌ Deployment failed:", error.message);
    // console.error("----------------------------------------------------");
    process.exit(1);
  }
}

// Run main if script is executed directly
if (require.main === module) {
main()
    .then(() => process.exit(0))
  .catch((error) => {
    // console.error(error);
    process.exit(1);
  });
}

module.exports = {
  deploy,
  getDeployConfig,
  saveDeploymentInfo
};