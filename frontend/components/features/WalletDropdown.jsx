"use client";

import { useState, useEffect } from "react";
import { useConnect, useDisconnect } from "wagmi";
import { useUser } from "@/context/UserContext";
import {
  Dropdown,
  DropdownItem,
  DropdownSection,
} from "@/components/ui/Dropdown";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

export function WalletDropdown() {
  const [demoWallets, setDemoWallets] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  const { disconnect } = useDisconnect();
  const {
    address,
    isConnected,
    userRole,
    saveWalletData,
    getWalletData,
    removeWalletData,
  } = useUser();

  const { connect, connectors, isLoading, pendingConnector } = useConnect({
    onSuccess(data) {
      setIsConnecting(false);
      setConnectionError(null);
      setTimeout(() => {
        document.body.classList.remove("wallet-connecting");
      }, 500);
    },
    onError(error) {
      console.error("Connection error:", error);
      setIsConnecting(false);
      setConnectionError(error.message);
      document.body.classList.remove("wallet-connecting");
    },
  });

  useEffect(() => {
    const loadWallets = async () => {
      try {
        setLoading(true);

        // Fetch wallets from the API
        const response = await fetch("/api/wallets");
        if (!response.ok) {
          throw new Error("Failed to fetch wallet data");
        }

        const wallets = await response.json();
        setDemoWallets(wallets);
      } catch (error) {
        console.error("Failed to load demo wallets:", error);
      } finally {
        setLoading(false);
      }
    };

    loadWallets();
  }, []);

  // Auto-connect
  useEffect(() => {
    const walletData = getWalletData();
    if (walletData && !isConnected && !isLoading) {
      try {
        const { role } = walletData;

        if (role) {
          setIsConnecting(true);
          // Add connecting class to body
          document.body.classList.add("wallet-connecting");

          const demoConnector = connectors.find((c) => c.id === "demoWallet");
          if (demoConnector) {
            connect({ connector: demoConnector }).catch((err) => {
              console.error("Auto-connect error:", err);
              setConnectionError(err.message);
              setIsConnecting(false);
              document.body.classList.remove("wallet-connecting");
            });
          }
        }
      } catch (error) {
        console.error("Error during auto-connect:", error);
      }
    }
  }, [isConnected, isLoading, connectors, connect, getWalletData]);

  const connectWallet = async (role) => {
    if (!demoWallets || !demoWallets[role]) throw new Error("Wallet not found");

    try {
      // Clear any previous errors and set connecting state
      setConnectionError(null);
      setIsConnecting(true);

      // Add connecting class to body
      document.body.classList.add("wallet-connecting");

      const wallet = demoWallets[role];
      if (isConnected) {
        console.log("Switching wallet...");
        await disconnect();
      }

      // Save wallet information
      saveWalletData({
        role,
        address: wallet.address,
        privateKey: wallet.privateKey,
      });

      // Connect with the new wallet
      const demoConnector = connectors.find((c) => c.id === "demoWallet");
      if (!demoConnector) {
        throw new Error("Demo wallet connector not found");
      }
      try {
        await connect({ connector: demoConnector });
      } catch (error) {
        // Ignore "already connected" errors as they don't affect functionality
        if (!error.message?.includes("already connected")) {
          throw error;
        }
      }

      setIsConnecting(false);
    } catch (error) {
      console.error("Error connecting wallet:", error);
      // Only show errors that would affect functionality
      if (!error.message?.includes("already connected")) {
        setConnectionError(error.message);
      }
      setIsConnecting(false);
    } finally {
      document.body.classList.remove("wallet-connecting");
    }
  };

  const copyAddressToClipboard = () => {
    if (demoWallets && userRole) {
      navigator.clipboard.writeText(demoWallets[userRole].address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  // Get role color
  const getRoleColor = (role) => {
    switch (role) {
      case "admin":
        return "bg-purple-600";
      case "regulator":
        return "bg-blue-600";
      case "user1":
        return "bg-green-600";
      case "user2":
        return "bg-yellow-600";
      default:
        return "bg-gray-600";
    }
  };

  // Get role button color - simplified to use consistent styling
  const getRoleButtonColor = (role) => {
    return userRole === role
      ? "bg-gray-700 text-white"
      : "bg-gray-100 text-gray-800 hover:bg-gray-200";
  };

  // Get role label text
  const getRoleLabel = (role) => {
    switch (role) {
      case "admin":
        return "RE Developer";
      case "regulator":
        return "Regulator";
      case "user1":
        return "User 1";
      case "user2":
        return "User 2";
      default:
        return role;
    }
  };

  const walletButton = (
    <div
      className={`px-4 py-2 rounded-md font-bold flex text-white text-lg items-center transition-colors duration-200 ${getRoleColor(
        userRole
      )}`}
    >
      {isConnecting
        ? "Connecting..."
        : isConnected
        ? getRoleLabel(userRole)
        : "Connect Wallet"}
    </div>
  );

  if (loading) {
    return walletButton;
  }

  if (!demoWallets) {
    return <Alert variant="warning">No wallets available</Alert>;
  }

  return (
    <Dropdown
      trigger={walletButton}
      align="end"
      width="w-64"
      className="dropdown-wallet"
    >
      {connectionError && (
        <Alert variant="error" className="mb-2 text-sm">
          {connectionError}
          <div className="text-xs mt-1">
            Make sure your local Hardhat node is running
          </div>
        </Alert>
      )}

      {isConnected && (
        <DropdownSection>
          <div className="p-2 mb-2">
            <div
              className={`${getRoleColor(
                userRole
              )} text-white p-3 rounded-md text-sm mb-2`}
            >
              <div className="font-medium">{getRoleLabel(userRole)}</div>
              <div className="text-xs mt-1 flex justify-between items-center">
                <span className="truncate mr-2">
                  {address
                    ? `${address.substring(0, 12)}...${address.substring(
                        address.length - 4
                      )}`
                    : "..."}
                </span>
                <Button
                  variant="dark"
                  size="sm"
                  onClick={copyAddressToClipboard}
                  className="text-white/80 hover:text-white hover:bg-white/10 p-1"
                >
                  {copiedAddress ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
          </div>
        </DropdownSection>
      )}

      <DropdownSection title="Select Wallet">
        {Object.entries(demoWallets).map(([role]) => (
          <DropdownItem
            key={role}
            onClick={() => connectWallet(role)}
            disabled={isConnecting}
            className={`rounded-md ${getRoleButtonColor(
              role
            )} hover:bg-gray-500 hover:text-white`}
          >
            <div className="flex items-center">
              <div
                className={`h-2 w-2 rounded-full mr-2 ${getRoleColor(role)}`}
              ></div>
              <span>{getRoleLabel(role)}</span>
            </div>
          </DropdownItem>
        ))}
      </DropdownSection>

      {isConnected && (
        <DropdownSection>
          <DropdownItem
            onClick={() => {
              disconnect();
              removeWalletData();
            }}
            className="bg-red-50 text-red-700 hover:bg-red-100 rounded-md"
          >
            <div className="flex items-center">
              <span>Disconnect</span>
            </div>
          </DropdownItem>
        </DropdownSection>
      )}
    </Dropdown>
  );
}
