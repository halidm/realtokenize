const { spawn } = require("child_process");
const path = require("path");

// Function to run a command and return a promise
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(" ")}`);

    const child = spawn(command, args, {
      stdio: "inherit",
      shell: true,
      ...options,
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}

async function main() {
  try {
    // Step 1: Start Hardhat node
    console.log("\n======================\n[1/4] Starting Hardhat node...");
    const hardhatNode = spawn("npx", ["hardhat", "node"], {
      stdio: "inherit",
      shell: true,
    });

    // Give the node some time to start
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Step 2: Clean up the data directory
    console.log(
      "\n======================\n[2/4] Cleaning up the data directory..."
    );
    await runCommand("rm", ["-rf", "../frontend/data/*"]);
    await runCommand("npx", ["hardhat", "clean"]);

    // Step 3: Create demo wallets
    console.log("\n======================\n[3/4] Creating demo wallets...");
    await runCommand("npx", [
      "hardhat",
      "run",
      "scripts/create-wallets.js",
      "--network",
      "localhost",
    ]);

    // Give some time for the wallets to be created and funded
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 4: Deploy contracts
    console.log("\n======================\n[4/4] Deploying contracts...");
    await runCommand("npx", [
      "hardhat",
      "run",
      "scripts/deploy.js",
      "--network",
      "localhost",
    ]);

    // Handle cleanup when the process is terminated
    process.on("SIGINT", () => {
      console.log("Stopping all processes...");
      hardhatNode.kill();
      process.exit(0);
    });
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
