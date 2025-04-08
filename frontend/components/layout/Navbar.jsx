"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBalance } from "wagmi";
import { formatEther } from "viem";
import { useUser } from "@/context/UserContext";
import { WalletDropdown } from "@/components/features/WalletDropdown";

export function Navbar() {
  const pathname = usePathname();
  const { address, isConnected, isAdmin, isRegulator } = useUser();
  const [formattedEthBalance, setFormattedEthBalance] = useState("0.0000");

  // Get ETH balance of connected wallet
  const { data: ethBalance, isLoading: ethLoading } = useBalance({
    address,
    watch: true,
    enabled: isConnected && !!address,
  });

  // Format ETH balance for display
  useEffect(() => {
    if (ethBalance && ethBalance.value) {
      try {
        const ethAmount = parseFloat(formatEther(ethBalance.value));
        setFormattedEthBalance(
          ethAmount.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 4,
          })
        );
      } catch (error) {
        console.error("Error formatting ETH balance:", error);
        setFormattedEthBalance("0.0000");
      }
    }
  }, [ethBalance]);

  return (
    <nav className="bg-gray-800">
      <div className="w-full mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <img
              src="/logo.svg"
              alt="RealTokenize Logo"
              width={32}
              height={32}
            />
            <Link href="/" className="flex items-center ml-2">
              <span className="text-xl font-bold text-white">RealTokenize</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex space-x-8 mx-4">
            <Link
              href="/"
              className={`px-3 py-2 text-white font-medium rounded-md ${
                pathname === "/" ? "bg-white/20" : "hover:bg-white/10"
              }`}
            >
              Home
            </Link>
            <Link
              href="/properties"
              className={`px-3 py-2 text-white font-medium rounded-md ${
                pathname === "/properties" ? "bg-white/20" : "hover:bg-white/10"
              }`}
            >
              Properties
            </Link>
            <Link
              href="/marketplace"
              className={`px-3 py-2 text-white font-medium rounded-md ${
                pathname === "/marketplace"
                  ? "bg-white/20"
                  : "hover:bg-white/10"
              }`}
            >
              Marketplace
            </Link>
            <Link
              href="/transactions"
              className={`px-3 py-2 text-white font-medium rounded-md ${
                pathname === "/transactions"
                  ? "bg-white/20"
                  : "hover:bg-white/10"
              }`}
            >
              Transactions
            </Link>
            {(isAdmin || isRegulator) && (
              <Link
                href="/vault"
                className={`px-3 py-2 text-white font-medium rounded-md ${
                  pathname === "/vault" ? "bg-white/20" : "hover:bg-white/10"
                }`}
              >
                Vault
              </Link>
            )}
            {isRegulator && (
              <Link
                href="/transfers"
                className={`px-3 py-2 text-white font-medium rounded-md ${
                  pathname === "/transfers"
                    ? "bg-white/20"
                    : "hover:bg-white/10"
                }`}
              >
                Transfers
              </Link>
            )}
          </div>

          {/* Wallet Section */}
          <div className="flex items-center space-x-4">
            {isConnected && ethBalance && !ethLoading && (
              <div
                variant="secondary"
                className="py-2 px-3 bg-white/10 hover:bg-white/20 text-white"
                disabled
              >
                {formattedEthBalance} ETH
              </div>
            )}
            <div className="relative" style={{ position: "relative" }}>
              <WalletDropdown />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
