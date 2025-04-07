"use client";

import { useState } from "react";
import { useAccount, useContractWrite, usePrepareContractWrite } from "wagmi";
import { parseEther } from "viem";
import RealEstateNFTABI from "@/contracts/RealEstateNFT.json";
import RegulatorABI from "@/contracts/Regulator.json";
import contractAddresses from "@/contracts/addresses.json";
import { Dialog } from "@/components/ui/Dialog";

export default function NFTSellModal({ isOpen, onClose, nft, addTransaction }) {
  const { address } = useAccount();
  const [sellInfo, setSellInfo] = useState({
    price: "",
    buyerAddress: "",
  });
  const [error, setError] = useState("");
  const [step, setStep] = useState("initial"); // "initial", "listing", "approving", "depositing"

  // Step 1: Create listing without pre-approval
  const { config: listingConfig } = usePrepareContractWrite({
    address: contractAddresses.Regulator,
    abi: RegulatorABI,
    functionName: "createListingWithoutPreApproval",
    args: [nft?.id, sellInfo.buyerAddress, parseEther(sellInfo.price || "0")],
    enabled: !!nft?.id && !!sellInfo.buyerAddress && !!sellInfo.price,
  });

  const { write: createListing, isLoading: isCreatingListing } =
    useContractWrite({
      ...listingConfig,
      onSuccess: (data) => {
        addTransaction({
          hash: data.hash,
          description: `Created listing for property #${nft?.id}`,
        });
        setStep("approving");
        // Once listing is created, proceed to approval
        approveNFT?.();
      },
      onError: (error) => {
        console.error("Error creating listing:", error);
        setError(
          "Failed to create listing. Please try again: " + error.message
        );
        setStep("initial");
      },
    });

  // Step 2: Approve the NFT
  const { config: approveConfig } = usePrepareContractWrite({
    address: contractAddresses.RealEstateNFT,
    abi: RealEstateNFTABI,
    functionName: "approve",
    args: [contractAddresses.Regulator, nft?.id],
    enabled: !!nft?.id && step === "approving",
  });

  const { write: approveNFT, isLoading: isApproving } = useContractWrite({
    ...approveConfig,
    onSuccess: (data) => {
      addTransaction({
        hash: data.hash,
        description: `Approved Regulator for property #${nft?.id}`,
      });
      setStep("depositing");
      // Once approval is granted, proceed to deposit
      depositNFT?.();
    },
    onError: (error) => {
      console.error("Error approving NFT:", error);
      setError("Failed to approve NFT. Please try again: " + error.message);
    },
  });

  // Step 3: Deposit the NFT
  const { config: depositConfig } = usePrepareContractWrite({
    address: contractAddresses.Regulator,
    abi: RegulatorABI,
    functionName: "depositListedNFT",
    args: [nft?.id],
    enabled: !!nft?.id && step === "depositing",
  });

  const { write: depositNFT, isLoading: isDepositing } = useContractWrite({
    ...depositConfig,
    onSuccess: (data) => {
      addTransaction({
        hash: data.hash,
        description: `Deposited property #${nft?.id} into escrow`,
      });
      setStep("completed");
      setTimeout(() => {
        onClose();
      }, 2000);
    },
    onError: (error) => {
      console.error("Error depositing NFT:", error);
      setError("Failed to deposit NFT. Please try again: " + error.message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!sellInfo.price || parseFloat(sellInfo.price) <= 0) {
      setError("Please enter a valid price");
      return;
    }

    if (!sellInfo.buyerAddress) {
      setError("Please enter a buyer address");
      return;
    }

    setStep("listing");
    createListing?.();
  };

  const isProcessing = isCreatingListing || isApproving || isDepositing;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Sell Property"
      preventClose={isProcessing}
      className="max-w-md"
    >
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {step === "completed" ? (
        <div className="p-4 bg-green-100 text-green-700 rounded-md text-center">
          <svg
            className="h-16 w-16 mx-auto text-green-500 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <p className="font-bold text-lg">Success!</p>
          <p>Property has been listed and deposited in escrow.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="price"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Price (ETH)
            </label>
            <input
              id="price"
              type="number"
              step="0.01"
              value={sellInfo.price}
              onChange={(e) =>
                setSellInfo({ ...sellInfo, price: e.target.value })
              }
              className="w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
              required
              disabled={isProcessing || step !== "initial"}
            />
          </div>

          <div>
            <label
              htmlFor="buyerAddress"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Buyer Address
            </label>
            <input
              id="buyerAddress"
              type="text"
              value={sellInfo.buyerAddress}
              onChange={(e) =>
                setSellInfo({ ...sellInfo, buyerAddress: e.target.value })
              }
              className="w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="0x..."
              required
              disabled={isProcessing || step !== "initial"}
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={isProcessing || step !== "initial"}
            >
              {step === "initial" ? "List Property" : "Processing..."}
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm text-gray-600">
        <p className="font-medium mb-2">Listing Process:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li
            className={
              step === "listing"
                ? "text-blue-600 font-medium"
                : step !== "initial"
                ? "text-green-600 line-through"
                : ""
            }
          >
            Create listing {step !== "initial" && step !== "listing" && "✓"}
          </li>
          <li
            className={
              step === "approving"
                ? "text-blue-600 font-medium"
                : step !== "initial" &&
                  step !== "listing" &&
                  step !== "approving"
                ? "text-green-600 line-through"
                : ""
            }
          >
            Approve NFT{" "}
            {step !== "initial" &&
              step !== "listing" &&
              step !== "approving" &&
              "✓"}
          </li>
          <li
            className={
              step === "depositing"
                ? "text-blue-600 font-medium"
                : step === "completed"
                ? "text-green-600 line-through"
                : ""
            }
          >
            Deposit NFT to escrow {step === "completed" && "✓"}
          </li>
          <li>Buyer will be notified to send payment</li>
        </ol>
      </div>
    </Dialog>
  );
} 