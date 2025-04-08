import { readContract } from "@wagmi/core";
import RealEstateNFTABI from "@/contracts/RealEstateNFT.json";
import contractAddresses from "@/contracts/addresses.json";

/**
 * Fetches NFT metadata for a given token ID
 * @param {string} tokenId - The token ID to fetch metadata for
 * @returns {Promise<Object>} The NFT metadata
 */
export async function fetchNFTMetadata(tokenId) {
  try {
    const tokenURI = await readContract({
      address: contractAddresses.RealEstateNFT,
      abi: RealEstateNFTABI,
      functionName: "tokenURI",
      args: [tokenId],
    });

    let metadata = {};
    if (tokenURI.startsWith("data:application/json;base64,")) {
      const base64Data = tokenURI.replace("data:application/json;base64,", "");
      const jsonString = atob(base64Data);
      metadata = JSON.parse(jsonString);
    } else {
      // Handle other tokenURI formats if needed
      const response = await fetch(tokenURI);
      metadata = await response.json();
    }

    return {
      id: tokenId.toString(),
      name: metadata.name || `Property #${tokenId}`,
      description: metadata.description || "No description available",
      image: metadata.image || "/images/placeholder-property.jpg",
    };
  } catch (error) {
    console.error("Error fetching NFT metadata:", error);
    return {
      id: tokenId.toString(),
      name: `Property #${tokenId}`,
      description: "Error fetching metadata",
      image: "/images/placeholder-property.jpg",
    };
  }
}
