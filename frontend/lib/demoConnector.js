import { Connector } from "wagmi";
import { createWalletClient, http, custom } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";

export class DemoWalletConnector extends Connector {
  constructor(config) {
    super({
      ...config,
      options: {
        ...config.options,
      },
    });
    this.id = "demoWallet";
    this.name = "Demo Wallet";
    this.ready = true;

    // Store the chain configuration
    this.chains = config.chains || [hardhat];
  }

  async connect() {
    try {
      console.log("Connecting to demo wallet...");

      // Get wallet data
      const selectedWallet = localStorage.getItem("selectedWallet");
      if (!selectedWallet) {
        throw new Error("No wallet selected");
      }

      const { role, address, privateKey } = JSON.parse(selectedWallet);

      // No need to check if already connected - we're explicitly connecting

      // Ensure the private key is properly formatted
      const formattedPrivateKey = privateKey.startsWith("0x")
        ? privateKey
        : `0x${privateKey}`;

      // Create an account from the private key
      const account = privateKeyToAccount(formattedPrivateKey);

      // Use the first chain from the list, defaulting to hardhat
      const chain = this.chains[0] || hardhat;

      // Create a wallet client
      const walletClient = createWalletClient({
        account,
        chain,
        transport: http("http://127.0.0.1:8545"),
      });

      // Store the wallet client for later use
      this.walletClient = walletClient;
      this.account = account.address;
      this.chainId = chain.id;

      // Emit connection event
      this.emit("connect", {
        account: account.address,
        chain: { id: chain.id, unsupported: false },
      });

      return {
        account: account.address,
        chain: { id: chain.id, unsupported: false },
      };
    } catch (error) {
      console.error("Connection error:", error);
      throw error;
    }
  }

  async disconnect() {
    // We don't need to clear localStorage here, the UI handles that
    console.log("Disconnecting wallet...");

    this.walletClient = undefined;
    this.account = undefined;
    this.chainId = undefined;
    this.emit("disconnect");
  }

  async getAccount() {
    if (!this.account) {
      const selectedWallet = localStorage.getItem("selectedWallet");
      if (selectedWallet) {
        const { address } = JSON.parse(selectedWallet);
        this.account = address;
      } else {
        throw new Error("No wallet selected");
      }
    }
    return this.account;
  }

  async getChainId() {
    return this.chainId || this.chains[0]?.id || 1337;
  }

  async isAuthorized() {
    try {
      const selectedWallet = localStorage.getItem("selectedWallet");
      return !!selectedWallet;
    } catch {
      return false;
    }
  }

  async getProvider() {
    const chain = this.chains[0] || hardhat;
    return {
      on: () => {},
      removeListener: () => {},
      request: async ({ method, params }) => {
        if (method === "eth_accounts" || method === "eth_requestAccounts") {
          return [await this.getAccount()];
        }
        if (method === "eth_chainId") {
          return `0x${chain.id.toString(16)}`;
        }
        throw new Error(`Method ${method} not implemented`);
      },
    };
  }

  async getSigner() {
    return this.walletClient;
  }

  async getWalletClient() {
    return this.walletClient;
  }

  async switchChain(chainId) {
    const chain = this.chains.find((c) => c.id === chainId) || hardhat;
    this.chainId = chainId;
    return { id: chainId, unsupported: false };
  }

  onAccountsChanged(accounts) {
    if (accounts.length === 0) {
      this.emit("disconnect");
    } else {
      this.emit("change", { account: accounts[0] });
    }
  }

  onChainChanged(chainId) {
    this.emit("change", { chain: { id: chainId, unsupported: false } });
  }

  onDisconnect() {
    this.emit("disconnect");
  }
}
