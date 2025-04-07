const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const WALLETS_PATH = "../frontend/data/wallets";
const CONTRACTS_PATH = "../frontend/data/contracts";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Ensure the contracts directory exists
  const contractsPath = path.join(__dirname, CONTRACTS_PATH);
  console.log("Creating contracts directory at", contractsPath);
  if (!fs.existsSync(contractsPath)) {
    fs.mkdirSync(contractsPath, { recursive: true });
  }

  // Load the admin and regulator wallets from the wallets.json file
  let adminWallet, regulatorWallet;
  try {
    const walletsPath = path.join(__dirname, WALLETS_PATH, "wallets.json");
    const wallets = JSON.parse(fs.readFileSync(walletsPath, "utf8"));
    adminWallet = wallets.admin;
    regulatorWallet = wallets.regulator;
    console.log("Admin wallet loaded:", adminWallet.address);
    console.log("Regulator wallet loaded:", regulatorWallet.address);
  } catch (error) {
    console.error("Error loading wallets:", error);
    console.log("Continuing with deployer as admin...");
    adminWallet = { address: deployer.address };
    regulatorWallet = { address: deployer.address };
  }

  // Deploy RealEstateNFT
  console.log("Deploying RealEstateNFT...");
  const RealEstateNFT = await hre.ethers.getContractFactory("RealEstateNFT");
  const realEstateNFT = await RealEstateNFT.deploy(deployer.address); // Temporary regulator
  await realEstateNFT.waitForDeployment();
  const realEstateNFTAddress = await realEstateNFT.getAddress();
  console.log("RealEstateNFT deployed to:", realEstateNFTAddress);

  // Deploy Regulator with RealEstateNFT address
  console.log("Deploying Regulator...");
  const Regulator = await hre.ethers.getContractFactory("Regulator");
  const regulator = await Regulator.deploy(realEstateNFTAddress);
  await regulator.waitForDeployment();
  const regulatorAddress = await regulator.getAddress();
  console.log("Regulator deployed to:", regulatorAddress);

  // Update RealEstateNFT with the correct regulator address
  console.log("Updating RealEstateNFT with correct regulator address...");
  try {
    const setRegulatorTx = await realEstateNFT.setRegulator(regulatorAddress);
    await setRegulatorTx.wait();
    console.log("Updated RealEstateNFT regulator address");
  } catch (error) {
    console.error("Failed to update regulator address:", error);
    process.exit(1);
  }

  // Deploy BasketToken
  console.log("Deploying BasketToken...");
  const BasketToken = await hre.ethers.getContractFactory("BasketToken");
  const basketToken = await BasketToken.deploy();
  await basketToken.waitForDeployment();
  const basketTokenAddress = await basketToken.getAddress();
  console.log("BasketToken deployed to:", basketTokenAddress);

  // Deploy Vault
  console.log("Deploying Vault...");
  const Vault = await hre.ethers.getContractFactory("Vault");
  const vault = await Vault.deploy(realEstateNFTAddress, basketTokenAddress);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("Vault deployed to:", vaultAddress);

  // Set vault address in BasketToken
  console.log("Setting vault address in BasketToken...");
  const setVaultTx = await basketToken.setVaultAddress(vaultAddress);
  await setVaultTx.wait();
  console.log("Set vault address in BasketToken");

  // Transfer ownership of contracts
  if (
    adminWallet.address.toLowerCase() !== deployer.address.toLowerCase() ||
    regulatorWallet.address.toLowerCase() !== deployer.address.toLowerCase()
  ) {
    // Transfer Regulator ownership to regulator wallet
    console.log(
      `Transferring Regulator ownership to regulator wallet: ${regulatorWallet.address}`
    );
    const transferRegulatorOwnershipTx = await regulator.transferOwnership(
      regulatorWallet.address
    );
    await transferRegulatorOwnershipTx.wait();
    console.log("Transferred Regulator ownership to regulator");

    // Transfer other contracts to admin wallet if different from deployer
    if (adminWallet.address.toLowerCase() !== deployer.address.toLowerCase()) {
      console.log(
        `Transferring other contracts to admin wallet: ${adminWallet.address}`
      );

      // Transfer RealEstateNFT ownership
      const transferNFTOwnershipTx = await realEstateNFT.transferOwnership(
        adminWallet.address
      );
      await transferNFTOwnershipTx.wait();
      console.log("Transferred RealEstateNFT ownership to admin");

      // Transfer BasketToken ownership
      const transferTokenOwnershipTx = await basketToken.transferOwnership(
        adminWallet.address
      );
      await transferTokenOwnershipTx.wait();
      console.log("Transferred BasketToken ownership to admin");

      // Transfer Vault ownership
      const transferVaultOwnershipTx = await vault.transferOwnership(
        adminWallet.address
      );
      await transferVaultOwnershipTx.wait();
      console.log("Transferred Vault ownership to admin");
    }
  }

  // Save contract addresses to a file
  const addresses = {
    Regulator: regulatorAddress,
    RealEstateNFT: realEstateNFTAddress,
    BasketToken: basketTokenAddress,
    Vault: vaultAddress,
    chainId: hre.network.config.chainId,
    adminAddress: adminWallet.address,
  };

  const addressesPath = path.join(__dirname, CONTRACTS_PATH, "addresses.json");
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log("Contract addresses saved to:", addressesPath);

  // Copy Regulator ABI
  const regulatorArtifact = await hre.artifacts.readArtifact("Regulator");
  fs.writeFileSync(
    path.join(__dirname, CONTRACTS_PATH, "Regulator.json"),
    JSON.stringify(regulatorArtifact.abi, null, 2)
  );

  // Copy RealEstateNFT ABI
  const realEstateNFTArtifact = await hre.artifacts.readArtifact(
    "RealEstateNFT"
  );
  fs.writeFileSync(
    path.join(__dirname, CONTRACTS_PATH, "RealEstateNFT.json"),
    JSON.stringify(realEstateNFTArtifact.abi, null, 2)
  );

  // Copy BasketToken ABI
  const basketTokenArtifact = await hre.artifacts.readArtifact("BasketToken");
  fs.writeFileSync(
    path.join(__dirname, CONTRACTS_PATH, "BasketToken.json"),
    JSON.stringify(basketTokenArtifact.abi, null, 2)
  );

  // Copy Vault ABI
  const vaultArtifact = await hre.artifacts.readArtifact("Vault");
  fs.writeFileSync(
    path.join(__dirname, CONTRACTS_PATH, "Vault.json"),
    JSON.stringify(vaultArtifact.abi, null, 2)
  );

  console.log("Contract ABIs copied to frontend");
  console.log("Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
