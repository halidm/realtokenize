const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const WALLETS_PATH = "../frontend/data/wallets";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Creating demo wallets using account:", deployer.address);

  // Create demo wallets
  const wallets = {
    admin: await createWallet("Admin"),
    regulator: await createWallet("Regulator"),
    user1: await createWallet("User 1"),
    user2: await createWallet("User 2"),
  };

  // Save wallet info to a file
  const walletsPath = path.join(__dirname, WALLETS_PATH, "wallets.json");

  // Create directory if it doesn't exist
  const dir = path.dirname(walletsPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(walletsPath, JSON.stringify(wallets, null, 2));
  console.log("Demo wallets saved to:", walletsPath);

  // Fund the wallets
  for (const [role, wallet] of Object.entries(wallets)) {
    await fundWallet(wallet.address, role);
  }
}

async function createWallet(name) {
  // Create a new wallet
  const wallet = hre.ethers.Wallet.createRandom();

  console.log(`Created ${name} wallet: ${wallet.address}`);

  return {
    address: wallet.address,
    privateKey: wallet.privateKey.slice(2),
  };
}

async function fundWallet(address, role) {
  const [deployer] = await hre.ethers.getSigners();

  // Send 10 ETH to each wallet
  const amount = hre.ethers.parseEther("10");
  const tx = await deployer.sendTransaction({
    to: address,
    value: amount,
  });

  await tx.wait();
  console.log(`Funded ${role} wallet (${address}) with 10 ETH`);

  // If this is the admin wallet, send extra ETH for contract deployments and transactions
  if (role === "admin") {
    const extraAmount = hre.ethers.parseEther("90");
    const extraTx = await deployer.sendTransaction({
      to: address,
      value: extraAmount,
    });

    await extraTx.wait();
    console.log(
      `Funded admin wallet with additional 50 ETH for contract operations`
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
