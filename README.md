# Tokenized Real Estate Demo

This project demonstrates a simple implementation of real estate tokenization using Ethereum smart contracts.

## Features

- ERC721 tokens representing real estate properties
- ERC20 tokens representing fractional ownership
- Vault contract for depositing NFTs and minting fractional tokens
- Demo UI for interacting with the contracts

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```

## Running the Demo

You can run the entire demo with a single command:

```
npm run demo
```

This will:
1. Start a local Hardhat node
2. Create demo wallets
3. Deploy the contracts
4. Start the Next.js app

Alternatively, you can run each step manually:

```
# Start a local Hardhat node
npm run node

# In a new terminal:
# Create demo wallets
npm run create-wallets

# Deploy contracts
npm run deploy

# Start the Next.js app
npm run dev
```

## Demo Wallets

The demo creates four wallets:
- Admin: Can mint NFTs and manage the platform
- Regulator: Can view transactions and properties
- User 1: Can buy, deposit, and redeem NFTs
- User 2: Can buy, deposit, and redeem NFTs

## Smart Contracts

1. **RealEstateNFT**: ERC721 token representing real estate properties
2. **Regulator**: Controls property transfers and provides escrow services for sales
3. **Vault**: Holds NFTs and issues corresponding tokens
4. **BasketToken**: ERC20 token representing fractional ownership of properties

## Docs

For detailed documentation about the smart contracts and system architecture, see [Contract Overview](./docs/contract-overview.md). All documentation files are located in the `./docs` folder.

## License

MIT 