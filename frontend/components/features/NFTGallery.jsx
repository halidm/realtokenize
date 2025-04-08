"use client";

import { useState, useEffect } from "react";
import { useAccount, useContractRead } from "wagmi";
import { readContract } from "@wagmi/core";
import NFTModal from "@/components/features/NFTModal";
import NFTCard from "@/components/features/NFTCard";
import RealEstateNFTABI from "@/contracts/RealEstateNFT.json";
import RegulatorABI from "@/contracts/Regulator.json";
import contractAddresses from "@/contracts/addresses.json";
import VaultABI from "@/contracts/Vault.json";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { useTransactions } from "@/context/TransactionContext";

export default function NFTGallery() {
  const { address, isConnected } = useAccount();
  const { logTransaction } = useTransactions();
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewMode, setViewMode] = useState("owned"); // "owned" or "all"
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingListings, setPendingListings] = useState({});
  const [isNFTModalOpen, setIsNFTModalOpen] = useState(false);

  // Function to handle manual refresh
  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    setRefreshKey((prevKey) => prevKey + 1);
  };

  // Modal handlers
  const handleOpenNFTModal = () => {
    setIsNFTModalOpen(true);
  };

  const handleCloseNFTModal = () => {
    setIsNFTModalOpen(false);

    // Force immediate refresh
    setLoading(true);
    setError(null);

    // Execute a delayed refresh to ensure blockchain state is updated
    setTimeout(() => {
      console.log("Executing delayed refresh after NFT modal close");
      setRefreshKey((prevKey) => prevKey + 1);
    }, 1000);
  };

  // Check if connected wallet is admin
  useEffect(() => {
    if (isConnected) {
      const savedWallet = localStorage.getItem("selectedWallet");
      if (savedWallet) {
        try {
          const { role } = JSON.parse(savedWallet);
          setIsAdmin(role === "admin");
        } catch (error) {
          console.error("Error parsing saved wallet:", error);
        }
      }
    } else {
      setIsAdmin(false);
    }
  }, [isConnected]);

  // Get user's listings that need deposit
  const { data: pendingListingsData, refetch: refetchPendingListings } =
    useContractRead({
      address: contractAddresses.Regulator,
      abi: RegulatorABI,
      functionName: "getPropertiesListedBySeller",
      args: [address],
      enabled: isConnected && !!address,
      watch: true,
    });

  // Process pending listings data
  useEffect(() => {
    if (pendingListingsData) {
      console.log("Raw pending listings data:", pendingListingsData);
      const pendingMap = {};
      pendingListingsData.forEach((listing) => {
        if (!listing.nftDeposited) {
          const tokenIdStr = listing.tokenId.toString();
          console.log(
            `Found pending listing for token ${tokenIdStr}:`,
            listing
          );
          pendingMap[tokenIdStr] = {
            buyer: listing.buyer,
            price: listing.price,
          };
        }
      });
      console.log("Processed pending listings map:", pendingMap);
      setPendingListings(pendingMap);
    }
  }, [pendingListingsData]);

  // Refresh pending listings when refreshKey changes
  useEffect(() => {
    if (isConnected && address) {
      refetchPendingListings();
    }
  }, [refreshKey, isConnected, address, refetchPendingListings]);

  // Get total supply of NFTs
  const { data: totalSupply, refetch: refetchTotalSupply } = useContractRead({
    address: contractAddresses.RealEstateNFT,
    abi: RealEstateNFTABI,
    functionName: "totalSupply",
    enabled: isConnected && isAdmin,
  });

  // Get balance of NFTs owned by the user
  const { data: balance, refetch: refetchBalance } = useContractRead({
    address: contractAddresses.RealEstateNFT,
    abi: RealEstateNFTABI,
    functionName: "balanceOf",
    args: [address],
    enabled: isConnected && !!address,
    onError: (err) => {
      console.error("Error reading NFT balance:", err);
      setError(
        "Failed to connect to the NFT contract. Please check if contracts are deployed correctly."
      );
      setLoading(false);
    },
  });

  // Trigger refetch when refreshKey changes
  useEffect(() => {
    if (isConnected) {
      console.log("Refresh triggered, fetching latest NFT data...");
      if (isAdmin) {
        refetchTotalSupply();
      }
      if (address) {
        refetchBalance();
      }
    }
  }, [
    refreshKey,
    isConnected,
    isAdmin,
    address,
    refetchTotalSupply,
    refetchBalance,
  ]);

  // Fetch NFTs when balance or totalSupply is available
  useEffect(() => {
    const fetchNFTs = async () => {
      if (!isConnected || !address) {
        setLoading(false);
        return;
      }

      try {
        const userNfts = [];

        if (viewMode === "owned" && balance) {
          // Fetch NFTs owned by the user
          const balanceNumber = Number(balance);

          for (let i = 0; i < balanceNumber; i++) {
            try {
              // Get token ID at index i
              const tokenId = await readContract({
                address: contractAddresses.RealEstateNFT,
                abi: RealEstateNFTABI,
                functionName: "tokenOfOwnerByIndex",
                args: [address, i],
              });

              // Fetch metadata for this token ID
              const metadata = await fetchNFTMetadata(tokenId.toString());

              // Add ownership information
              metadata.isOwnedByUser = true;
              metadata.owner = address;

              // Check if the NFT is in the vault
              try {
                const tokenAmount = await readContract({
                  address: contractAddresses.Vault,
                  abi: VaultABI,
                  functionName: "getTokenAmount",
                  args: [tokenId],
                });

                metadata.isInVault = Number(tokenAmount) > 0;
                metadata.tokenAmount = Number(tokenAmount);
              } catch (error) {
                metadata.isInVault = false;
                metadata.tokenAmount = 0;
              }

              userNfts.push(metadata);
            } catch (error) {
              console.error(`Error fetching user NFT at index ${i}:`, error);
            }
          }
        } else if (viewMode === "all" && totalSupply) {
          // Fetch all NFTs (for admin)
          const totalSupplyNumber = Number(totalSupply);

          for (let i = 0; i < totalSupplyNumber; i++) {
            try {
              // Get token ID at index i
              const tokenId = await readContract({
                address: contractAddresses.RealEstateNFT,
                abi: RealEstateNFTABI,
                functionName: "tokenByIndex",
                args: [i],
              });

              // Get owner of this token ID
              const owner = await readContract({
                address: contractAddresses.RealEstateNFT,
                abi: RealEstateNFTABI,
                functionName: "ownerOf",
                args: [tokenId],
              });

              // Fetch metadata for this token ID
              const metadata = await fetchNFTMetadata(tokenId.toString());

              // Add ownership information
              metadata.isOwnedByUser =
                owner.toLowerCase() === address.toLowerCase();
              metadata.owner = owner;

              // Check if the NFT is in the vault
              try {
                const tokenAmount = await readContract({
                  address: contractAddresses.Vault,
                  abi: VaultABI,
                  functionName: "getTokenAmount",
                  args: [tokenId],
                });

                metadata.isInVault = Number(tokenAmount) > 0;
                metadata.tokenAmount = Number(tokenAmount);
              } catch (error) {
                metadata.isInVault = false;
                metadata.tokenAmount = 0;
              }

              userNfts.push(metadata);
            } catch (error) {
              console.error(`Error fetching NFT at index ${i}:`, error);
            }
          }
        }

        setNfts(userNfts);
        setError(null);
      } catch (err) {
        console.error("Error fetching NFTs:", err);
        setError("Failed to load NFTs. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchNFTs();
  }, [address, isConnected, viewMode, balance, totalSupply, refreshKey]);

  // Helper function to fetch NFT metadata
  const fetchNFTMetadata = async (tokenId) => {
    try {
      // Get token URI
      const tokenURI = await readContract({
        address: contractAddresses.RealEstateNFT,
        abi: RealEstateNFTABI,
        functionName: "tokenURI",
        args: [tokenId],
      });

      // Parse metadata
      let metadata;
      try {
        // Try to fetch and parse the URI
        const cleanURI = tokenURI.replace("ipfs://", "https://ipfs.io/ipfs/");
        if (cleanURI.startsWith("http")) {
          const response = await fetch(cleanURI);
          metadata = await response.json();
        } else if (tokenURI.startsWith("data:application/json;base64,")) {
          // Handle base64 encoded data
          const base64Data = tokenURI.replace(
            "data:application/json;base64,",
            ""
          );
          const jsonString = atob(base64Data);
          metadata = JSON.parse(jsonString);
        } else {
          // Handle locally stored metadata
          metadata = JSON.parse(tokenURI);
        }
      } catch (error) {
        console.warn(
          `Couldn't parse metadata for token ${tokenId}, using default`
        );
        metadata = createDefaultNFT(tokenId, tokenURI);
      }

      // Add token ID
      metadata.id = tokenId;

      // Clean up image URL if it's IPFS
      if (metadata.image && metadata.image.startsWith("ipfs://")) {
        metadata.image = metadata.image.replace(
          "ipfs://",
          "https://ipfs.io/ipfs/"
        );
      }

      return metadata;
    } catch (error) {
      console.error(`Error fetching metadata for token ${tokenId}:`, error);
      return createDefaultNFT(tokenId, "Unknown");
    }
  };

  // Helper function to create a default NFT object
  const createDefaultNFT = (tokenId, tokenURI) => {
    return {
      id: tokenId,
      name: `Property #${tokenId}`,
      description: "Property details unavailable",
      image: "/images/placeholder-property.jpg",
      attributes: [],
    };
  };

  return (
    <>
      <Card>
        <CardHeader className="relative flex items-center justify-between">
          <CardTitle>
            {viewMode === "owned" ? "My Properties" : "All Properties"}
          </CardTitle>

          <div className="flex space-x-2">
            {isAdmin && (
              <div className="flex rounded-md shadow-sm">
                <Button
                  variant={viewMode === "owned" ? "primary" : "secondary"}
                  onClick={() => setViewMode("owned")}
                  className="rounded-l-md rounded-r-none px-4"
                >
                  My Properties
                </Button>
                <Button
                  variant={viewMode === "all" ? "primary" : "secondary"}
                  onClick={() => setViewMode("all")}
                  className="rounded-r-md rounded-l-none px-4"
                >
                  All Properties
                </Button>
              </div>
            )}

            <Button onClick={handleRefresh} variant="secondary">
              Refresh
            </Button>

            {isAdmin && (
              <Button onClick={handleOpenNFTModal} variant="primary">
                Create NFT
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {!isConnected ? (
            <div className="text-center py-10">
              <p className="mb-4">
                Please connect your wallet to view properties
              </p>
            </div>
          ) : loading ? (
            <div className="text-center py-10">
              <p>Loading properties...</p>
            </div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">
              <p>{error}</p>
            </div>
          ) : nfts.length === 0 ? (
            <div className="text-center py-10">
              <p>No properties found.</p>
              {isAdmin && (
                <Button
                  onClick={handleOpenNFTModal}
                  variant="primary"
                  className="mt-4"
                >
                  Create your first NFT
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
              {nfts.map((nft) => (
                <NFTCard
                  key={nft.id}
                  nft={nft}
                  isAdmin={isAdmin}
                  onUpdate={handleRefresh}
                  pendingListings={pendingListings}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <NFTModal isOpen={isNFTModalOpen} onClose={handleCloseNFTModal} />
    </>
  );
}
