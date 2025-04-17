/**
 * @title Generate Frontend Artifact Script
 * @description Script to generate the simplified QuickTokenArtifact.ts for the frontend
 *              from the canonical Hardhat artifact JSON file.
 * 
 * Run with: node scripts/generate-frontend-artifact.js
 * Or after compile: npx hardhat compile && node scripts/generate-frontend-artifact.js
 */

const fs = require('fs');
const path = require('path');

// --- Configuration ---
const SOURCE_ARTIFACT_PATH = path.join(__dirname, '..', 'artifacts', 'contracts', 'QuickToken.sol', 'QuickToken.json');
const TARGET_ARTIFACT_PATH = path.join(__dirname, '..', 'admin-dashboard', 'src', 'shared', 'abis', 'QuickToken.json');
// ---------------------

/**
 * Helper function to ensure bytecode starts with 0x for ethers.js v6
 * (Copied from the original QuickTokenArtifact.ts)
 */
function cleanBytecode(bytecode) {
  if (!bytecode || typeof bytecode !== 'string') {
    console.warn('Invalid or empty bytecode received, returning "0x"');
    return '0x';
  }
  // Ensure bytecode starts with 0x, remove existing if present to avoid duplication
  return '0x' + bytecode.replace(/^0x/, '');
}

/**
 * Main function to generate the artifact file.
 */
function generateFrontendArtifact() {
  try {
    // Ensure target directory exists
    const targetDir = path.dirname(TARGET_ARTIFACT_PATH);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      console.log(`Created target directory: ${targetDir}`);
    }
    
    // Check if source file exists
    if (!fs.existsSync(SOURCE_ARTIFACT_PATH)) {
        console.error(`\nError: Source artifact not found at ${SOURCE_ARTIFACT_PATH}`);
        console.error('Please ensure the contract has been compiled successfully ('npx hardhat compile').\n');
        process.exit(1); // Exit with error code
    }
    
    // console.log(`Reading source artifact from: ${SOURCE_ARTIFACT_PATH}`);
    const sourceArtifactRaw = fs.readFileSync(SOURCE_ARTIFACT_PATH, 'utf8');
    const sourceArtifact = JSON.parse(sourceArtifactRaw);
    
    // Check if ABI exists
    if (!sourceArtifact.abi) {
      console.error(`\nError: ABI not found in the source artifact: ${SOURCE_ARTIFACT_PATH}`);
      console.error('The compiled artifact seems incomplete. Please try recompiling ('npx hardhat compile').\n');
      process.exit(1); // Exit with error code
    }
    
    // Create the frontend artifact object (only include ABI for now)
    const frontendArtifact = {
      abi: sourceArtifact.abi,
      // Future: Could potentially include bytecode if needed for frontend deployment simulation
      // bytecode: sourceArtifact.bytecode,
    };
    
    // Write the cleaned artifact to the target location
    // console.log(`Generating frontend artifact at: ${TARGET_ARTIFACT_PATH}`);
    fs.writeFileSync(TARGET_ARTIFACT_PATH, JSON.stringify(frontendArtifact, null, 2), 'utf8');
    
    // console.log('✅ Frontend artifact generated successfully!');
    
  } catch (error) {
    console.error(`\n❌ Error generating frontend artifact: ${error.message}`);
    console.error(error.stack); // Print stack trace for more details
    process.exit(1); // Exit with error code
  }
}

// Run the generation process if the script is executed directly
if (require.main === module) {
  generateFrontendArtifact();
}

// Export the function in case it needs to be called programmatically
module.exports = generateFrontendArtifact; 