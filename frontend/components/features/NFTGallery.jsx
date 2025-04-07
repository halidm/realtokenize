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

export default function NFTGallery({ addTransaction }) {
  const { address, isConnected } = useAccount();
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
  const { data: pendingListingsData } = useContractRead({
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
      const pendingMap = {};
      pendingListingsData.forEach((listing) => {
        if (!listing.nftDeposited) {
          pendingMap[listing.tokenId.toString()] = {
            buyer: listing.buyer,
            price: listing.price,
          };
        }
      });
      setPendingListings(pendingMap);
    }
  }, [pendingListingsData]);

  // Get total supply of NFTs
  const { data: totalSupply } = useContractRead({
    address: contractAddresses.RealEstateNFT,
    abi: RealEstateNFTABI,
    functionName: "totalSupply",
    enabled: isConnected && isAdmin,
  });

  // Get balance of NFTs owned by the user
  const { data: balance } = useContractRead({
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

  // Render loading state
  if (loading) {
    return <div className="text-center py-8">Loading NFTs...</div>;
  }

  // Render error state
  if (error) {
    return (
      <Card className="text-center p-8 bg-red-50 border border-red-200">
        <CardHeader>
          <CardTitle className="text-xl font-medium text-red-800">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4">{error}</p>
          <Card className="p-4 bg-white text-gray-700 text-left">
            <CardContent>
              <p className="font-medium">Troubleshooting Steps:</p>
              <ol className="list-decimal list-inside text-sm mt-2">
                <li>
                  Make sure you're connected to the correct network (Hardhat
                  localhost)
                </li>
                <li>Verify that the contracts are deployed correctly</li>
                <li>
                  Check that the contract addresses in addresses.json are correct
                </li>
                <li>Restart the Hardhat node and redeploy the contracts</li>
              </ol>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    );
  }

  // Main gallery content
  return (
    <Card className="flex-1">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold">Real Estate NFTs</CardTitle>
          <Button
            onClick={handleRefresh}
            variant="link"
            size="sm"
            className="text-xs text-blue-500"
          >
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isAdmin && (
          <div className="flex justify-between items-center mb-4">
            <Button
              onClick={handleOpenNFTModal}
              variant="primary"
            >
              Mint NFT Property
            </Button>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">
            {viewMode === "owned" ? "Your Properties" : "All Properties"}
          </h3>
          <div className="flex border rounded-md overflow-hidden">
            <Button
              className={`px-3 py-1 text-sm rounded-none ${
                viewMode === "owned"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              onClick={() => setViewMode("owned")}
              variant={viewMode === "owned" ? "primary" : "secondary"}
            >
              My NFTs
            </Button>
            <Button
              className={`px-3 py-1 text-sm rounded-none ${
                viewMode === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              onClick={() => setViewMode("all")}
              variant={viewMode === "all" ? "primary" : "secondary"}
            >
              All NFTs
            </Button>
          </div>
        </div>

        {nfts.length === 0 ? (
          <Card className="text-center p-8 bg-gray-50 border border-gray-200">
            <CardContent>
              <h3 className="text-xl font-medium text-gray-800 mb-2">
                No Properties Available
              </h3>
              <p className="text-gray-600 mb-4">
                {viewMode === "owned"
                  ? "You don't own any real estate NFTs yet."
                  : "There are no real estate NFTs minted yet."}
                {isAdmin && " As an admin, you can mint new properties."}
              </p>
              <Card className="p-4 bg-blue-50 text-blue-700 inline-block">
                <CardContent>
                  <p className="font-medium">Getting Started</p>
                  <ol className="list-decimal list-inside text-sm mt-2 text-left">
                    <li>Connect with the Admin wallet</li>
                    <li>Use the Admin Panel to mint new properties</li>
                    <li>Properties will appear here once minted</li>
                  </ol>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nfts.map((nft) => (
              <NFTCard
                key={nft.id}
                nft={nft}
                pendingListings={pendingListings}
                addTransaction={addTransaction}
                viewMode={viewMode}
                onRefresh={handleRefresh}
              />
            ))}
          </div>
        )}

        {/* Modals */}
        <NFTModal
          isOpen={isNFTModalOpen}
          onClose={handleCloseNFTModal}
          addTransaction={addTransaction}
        />
      </CardContent>
    </Card>
  );
} 