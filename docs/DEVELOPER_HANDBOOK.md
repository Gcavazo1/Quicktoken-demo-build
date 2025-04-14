# 👨‍💻 QuickToken Kit — Developer Handbook

This handbook provides guidance for developers who want to extend, customize, or maintain the QuickToken Kit. It covers code organization, modification patterns, and best practices.

## 🏗️ Project Structure Overview

```
quicktoken-commercial/
├── contracts/            # Smart contract code
├── scripts/              # Deployment and interaction scripts  
├── admin-dashboard/      # React dashboard UI
├── test/                 # Contract test suite
├── config/               # Configuration files
└── docs/                 # Documentation
```

## 🧩 Extension Points

### Smart Contract Customization

The `QuickToken.sol` contract has several key extension points:

```solidity
// Extension point: Custom token features
function _beforeTokenTransfer(address from, address to, uint256 amount) internal override {
    super._beforeTokenTransfer(from, to, amount);
    // Add custom logic here
}

// Extension point: Mint fee calculation
function calculateMintFee(uint256 amount) public view returns (uint256) {
    // Customize fee calculation logic
}
```

#### Adding New Contract Features

1. Identify the appropriate extension point
2. Add your custom code
3. Update the ABI in `admin-dashboard/lib/QuickTokenABI.ts`
4. Add tests in `test/QuickToken.test.js`
5. Update deployment scripts if constructor parameters change

### Dashboard UI Customization

#### Custom Form Fields

To add a new field to the deployment form:

1. Edit `admin-dashboard/components/DeployForm.tsx` 
2. Add new state variable:
   ```tsx
   const [newField, setNewField] = useState('default');
   ```
3. Add form input element
4. Update the deployment function to include new parameter
5. Update token type definitions

#### Custom Token Actions

To add a new action to the TokenTable:

1. Edit `admin-dashboard/components/TokenTable.tsx`
2. Add new action button to the token row
3. Implement action handler function
4. Connect to contract method via ABI

## 🔧 Common Customization Scenarios

### 1. Custom Token Type

To add a specialized token type (e.g., "Vesting Token"):

1. Create a new contract inheriting from `QuickToken.sol`
2. Add vesting-specific parameters and functions
3. Create specialized deployment form components
4. Update ABI and deployment scripts

### 2. Additional Networks

To add support for additional networks:

1. Update `config/hardhat.config.js` with new network details
2. Add network configuration to dashboard
3. Update chain detection logic in `WalletConnectButton.tsx`
4. Add network-specific deployment options

### 3. Backend Integration

To add server-side tracking or features:

1. Create API endpoints for token tracking
2. Replace localStorage with API calls in dashboard
3. Add authentication if needed
4. Update deployment scripts to notify backend

## 🛠️ Development Workflow

### Local Development

```bash
# Start admin dashboard
cd admin-dashboard
npm install
npm run dev

# Deploy contract to local hardhat node
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
```

### Testing

```bash
# Run smart contract tests
npx hardhat test

# Run frontend tests
cd admin-dashboard
npm test
```

### Building for Production

```bash
# Build admin dashboard
cd admin-dashboard
npm run build

# Build landing page
cd landing-page
npm run build
```

## 🔒 Security Best Practices

1. **Always audit custom code** before production deployment
2. Use OpenZeppelin contracts for standard patterns
3. Test thoroughly, especially access control
4. Avoid storing private keys or sensitive data in code
5. Use environment variables for configuration

## 🧪 Testing Guidelines

### Smart Contract Testing

Each contract feature should have tests for:
- Normal operation
- Edge cases
- Access control
- Error conditions

### UI Testing

Dashboard components should be tested for:
- User input validation
- Wallet connection handling
- Error states and recovery
- Mobile responsiveness

## 📚 Documentation Standards

When extending the project, follow these documentation guidelines:

1. Update README.md with new features
2. Add JSDoc comments to functions
3. Update the ABI documentation when changing contracts
4. Document any new environment variables

## 🔍 Troubleshooting Common Issues

### Contract Deployment Failures

- Check network configuration
- Ensure wallet has sufficient funds
- Verify constructor arguments

### Dashboard Connection Issues

- Check wallet connection
- Verify network matches deployed contract
- Confirm ABI matches deployed contract

### Build Errors

- Clear node_modules and reinstall dependencies
- Check TypeScript errors
- Verify environment variables

## 🚀 Publishing Updates

When publishing template updates:

1. Update version numbers
2. Create detailed changelog
3. Test backward compatibility
4. Update documentation
5. Package all files with correct structure

---

By following these guidelines, you can extend and customize the QuickToken Kit while maintaining its quality, security, and user experience. 