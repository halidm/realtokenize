"use client";

import { useState, useEffect } from "react";
import { readContract } from "@wagmi/core";
import { useUser } from "@/context/UserContext";
import NFTCard from "@/components/features/NFTCard";
import { VaultDepositForm } from "@/components/features/VaultDepositForm";
import { TokenBalanceDisplay } from "@/components/features/TokenBalanceDisplay";
import { Alert } from "@/components/ui/Alert";
import { Loader } from "@/components/ui/Loader";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import RealEstateNFTABI from "@/contracts/RealEstateNFT.json";
import VaultABI from "@/contracts/Vault.json";
import contractAddresses from "@/contracts/addresses.json";

export default function VaultPage() {
  const { address, isConnected, isAdmin, isRegulator } = useUser();
  const [vaultedNFTs, setVaultedNFTs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [transactions, setTransactions] = useState([]);

  // Add transaction to log
  const addTransaction = (transaction) => {
    setTransactions((prev) => [transaction, ...prev]);
  };

  // Get NFTs in vault using a different approach
  useEffect(() => {
    const fetchVaultedNFTs = async () => {
      if (!isConnected) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get total NFT supply
        const totalSupply = await readContract({
          address: contractAddresses.RealEstateNFT,
          abi: RealEstateNFTABI,
          functionName: "totalSupply",
        });

        const totalSupplyNum = Number(totalSupply);
        const vaultAddress = contractAddresses.Vault;
        const vaultedNfts = [];

        // Check each NFT to see if it's in the vault
        for (let i = 0; i < totalSupplyNum; i++) {
          try {
            // Get token ID at index i
            const tokenId = await readContract({
              address: contractAddresses.RealEstateNFT,
              abi: RealEstateNFTABI,
              functionName: "tokenByIndex",
              args: [i],
            });

            // Check owner of this token ID
            const owner = await readContract({
              address: contractAddresses.RealEstateNFT,
              abi: RealEstateNFTABI,
              functionName: "ownerOf",
              args: [tokenId],
            });

            // If the vault owns this NFT, get its details
            if (owner.toLowerCase() === vaultAddress.toLowerCase()) {
              // Get token value from vault
              let tokenValue = BigInt(0);
              try {
                tokenValue = await readContract({
                  address: contractAddresses.Vault,
                  abi: VaultABI,
                  functionName: "getTokenAmount",
                  args: [tokenId],
                });
              } catch (error) {
                console.error(
                  `Error getting token value for NFT ${tokenId}:`,
                  error
                );
              }

              // Get token URI and metadata
              const tokenURI = await readContract({
                address: contractAddresses.RealEstateNFT,
                abi: RealEstateNFTABI,
                functionName: "tokenURI",
                args: [tokenId],
              });

              // Parse metadata
              let metadata = {
                name: `Property #${tokenId}`,
                description: "A tokenized real estate property",
                image: "/placeholder-property.jpg",
              };

              try {
                if (tokenURI.startsWith("data:application/json;base64,")) {
                  const base64Data = tokenURI.replace(
                    "data:application/json;base64,",
                    ""
                  );
                  const jsonString = atob(base64Data);
                  const parsedMetadata = JSON.parse(jsonString);
                  metadata = { ...metadata, ...parsedMetadata };
                }
              } catch (error) {
                console.error("Error parsing metadata:", error);
              }

              vaultedNfts.push({
                id: tokenId.toString(),
                tokenURI,
                value: tokenValue,
                isInVault: true,
                isOwnedByUser: false,
                owner: vaultAddress,
                tokenAmount: tokenValue,
                ...metadata,
              });
            }
          } catch (error) {
            console.error(`Error checking NFT at index ${i}:`, error);
          }
        }

        setVaultedNFTs(vaultedNfts);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching vaulted NFTs:", error);
        setError("Failed to fetch vaulted NFTs. Please try again.");
        setLoading(false);
      }
    };

    fetchVaultedNFTs();
  }, [isConnected, refreshTrigger, address]);

  // Handle successful deposit
  const handleDepositSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">NFT Vault</h1>
        <Alert variant="warning">
          Please connect your wallet to access the vault.
        </Alert>
      </div>
    );
  }

  if (!isAdmin && !isRegulator) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">NFT Vault</h1>
        <Alert variant="error">
          You do not have permission to access this page. Only administrators
          and regulators can view the vault.
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">NFT Vault</h1>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-2/3 flex flex-col gap-6 order-2 md:order-1">
          {/* Vault Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Vault Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Token Balance Display */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Token Balances</h3>
                <TokenBalanceDisplay />
              </div>

              {/* NFT Stats */}
              <div>
                <h3 className="text-lg font-semibold mb-2">NFT Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-gray-100">
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-500">Total NFTs</p>
                      <p className="text-2xl font-bold">{vaultedNFTs.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-100">
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-500">Total Value</p>
                      <p className="text-2xl font-bold">
                        {vaultedNFTs
                          .reduce(
                            (total, nft) =>
                              total + Number(nft.value) / 10 ** 18,
                            0
                          )
                          .toLocaleString()}{" "}
                        REBT
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* NFTs in Vault */}
          <Card>
            <CardHeader>
              <CardTitle>NFTs in Vault</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader size="lg" />
                  <span className="ml-2">Loading vault NFTs...</span>
                </div>
              ) : error ? (
                <Alert variant="error" className="mb-4">
                  {error}
                </Alert>
              ) : vaultedNFTs.length === 0 ? (
                <Alert variant="info" className="mb-4">
                  There are no NFTs in the vault yet.
                </Alert>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vaultedNFTs.map((nft) => (
                    <NFTCard
                      key={nft.id}
                      nft={nft}
                      pendingListings={{}}
                      addTransaction={addTransaction}
                      viewMode="all"
                      onRefresh={handleRefresh}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Vault Deposit Form */}
        <div className="w-full md:w-1/3 order-1 md:order-2 mb-6 md:mb-0">
          <VaultDepositForm onSuccess={handleDepositSuccess} />
        </div>
      </div>
    </div>
  );
}
