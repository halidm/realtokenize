"use client";

import { useState, useEffect } from "react";
import { useContractRead, useBalance } from "wagmi";
import { formatEther } from "viem";
import { useUser } from "@/context/UserContext";
import contractAddresses from "@/contracts/addresses.json";
import BasketTokenAbi from "@/contracts/BasketToken.json";
import { Card, CardContent } from "@/components/ui/Card";

export function TokenBalanceDisplay() {
  const { address, isConnected } = useUser();
  const [formattedBalance, setFormattedBalance] = useState("0");
  const [formattedEthBalance, setFormattedEthBalance] = useState("0");

  // Get ETH balance
  const { data: ethBalance, isLoading: ethLoading } = useBalance({
    address: address,
    watch: true,
    enabled: isConnected && !!address,
  });

  // Get token balance
  const { data: balance, isLoading } = useContractRead({
    address: contractAddresses.BasketToken,
    abi: BasketTokenAbi,
    functionName: "balanceOf",
    args: [address],
    watch: true,
    enabled: isConnected && !!address,
  });

  // Format balance for display
  useEffect(() => {
    if (balance) {
      // Convert from wei (10^18) to token units
      const tokenBalance = Number(balance) / 10 ** 18;
      setFormattedBalance(
        tokenBalance.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })
      );
    }
  }, [balance]);

  // Format ETH balance for display
  useEffect(() => {
    if (ethBalance) {
      const ethAmount = parseFloat(formatEther(ethBalance.value));
      setFormattedEthBalance(
        ethAmount.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 3,
        })
      );
    }
  }, [ethBalance]);

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="bg-gray-100">
        <CardContent className="p-4">
          <p className="text-sm text-gray-500">REBT Balance</p>
          <p className="text-2xl font-bold">{formattedBalance} REBT</p>
        </CardContent>
      </Card>
      <Card className="bg-gray-100">
        <CardContent className="p-4">
          <p className="text-sm text-gray-500">AED Balance</p>
          <p className="text-2xl font-bold">{formattedEthBalance}Mn AED</p>
        </CardContent>
      </Card>
    </div>
  );
}
