"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  useAccount,
  useContractRead,
  useContractWrite,
  usePrepareContractWrite,
} from "wagmi";
import { formatEther } from "viem";
import NFTSellModal from "@/components/features/NFTSellModal";
import contractAddresses from "@/contracts/addresses.json";
import RealEstateNFTABI from "@/contracts/RealEstateNFT.json";
import RegulatorABI from "@/contracts/Regulator.json";
import { useTransactions } from "@/context/TransactionContext";
import { useUser } from "@/context/UserContext";

export default function NFTCard({
  nft,
  pendingListings = {},
  viewMode,
  onRefresh,
}) {
  const { address } = useAccount();
  const { userRole } = useUser();
  const { logTransaction } = useTransactions();
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [transferStatus, setTransferStatus] = useState({
    loading: false,
    step: null,
    approved: false,
  });

  // Modal handlers
  const handleOpenSellModal = () => {
    setIsSellModalOpen(true);
  };

  const handleCloseSellModal = () => {
    setIsSellModalOpen(false);
    // Ensure proper refresh after modal is closed
    if (typeof onRefresh === "function") {
      console.log(`Triggering refresh from NFT ${nft.id} after modal close`);
      // Slight delay to ensure blockchain state is updated
      setTimeout(() => {
        onRefresh();
      }, 500);
    }
  };

  // Check if this NFT is pending deposit
  const pendingInfo = pendingListings && pendingListings[nft.id];
  const isPendingDeposit = !!pendingInfo;

  // Log what we're seeing for debugging
  useEffect(() => {
    console.log(`NFT ${nft.id} - isPendingDeposit:`, isPendingDeposit);
    console.log(`NFT ${nft.id} - pendingInfo:`, pendingInfo);
    console.log(`NFT ${nft.id} - pendingListings:`, pendingListings);
  }, [nft.id, isPendingDeposit, pendingInfo, pendingListings]);

  // Check if this NFT is currently being processed for approval or deposit
  const isBeingProcessed = transferStatus.loading;

  // Add contract read to check if approved
  const { data: approvalStatus, refetch: refetchApproval } = useContractRead({
    address: contractAddresses.RealEstateNFT,
    abi: RealEstateNFTABI,
    functionName: "getApproved",
    args: [nft.id],
    enabled: !!nft.id,
    watch: true,
  });

  // First approve the Regulator to transfer the NFT
  const { config: approveConfig } = usePrepareContractWrite({
    address: contractAddresses.RealEstateNFT,
    abi: RealEstateNFTABI,
    functionName: "approve",
    args: [contractAddresses.Regulator, nft.id],
    enabled: !!nft.id && !!address,
  });

  const {
    write: approveNFT,
    isLoading: isApproving,
    data: approveData,
  } = useContractWrite({
    ...approveConfig,
    onSuccess: (data) => {
      setTransferStatus({
        loading: true,
        step: "approving",
      });

      logTransaction({
        user: address,
        userRole: userRole,
        address: contractAddresses.RealEstateNFT,
        description: `Approved Regulator for property #${nft.id}`,
        hash: data.hash,
      });

      // Wait for the transaction to complete
      const checkInterval = setInterval(async () => {
        const result = await refetchApproval();
        const currentApproval = result.data;

        if (
          currentApproval &&
          currentApproval.toLowerCase() ===
            contractAddresses.Regulator.toLowerCase()
        ) {
          clearInterval(checkInterval);
          setTransferStatus({
            loading: false,
            step: "approved",
            approved: true,
          });
        }
      }, 2000);

      // Safety timeout after 30 seconds to avoid stuck UI
      setTimeout(() => {
        clearInterval(checkInterval);
        if (transferStatus.step === "approving") {
          setTransferStatus({
            loading: false,
            step: "approval-timeout",
          });
        }
      }, 5000);
    },
    onError: (error) => {
      console.error("Error approving NFT:", error);
      setTransferStatus({ loading: false, step: null });
    },
  });

  // Then deposit the NFT using the Regulator contract's function
  const { config: depositConfig } = usePrepareContractWrite({
    address: contractAddresses.Regulator,
    abi: RegulatorABI,
    functionName: "depositListedNFT",
    args: [nft.id],
    enabled:
      !!nft.id &&
      !!address &&
      approvalStatus &&
      approvalStatus.toLowerCase() ===
        contractAddresses.Regulator.toLowerCase(),
  });

  const {
    write: depositNFT,
    isLoading: isDepositing,
    data: depositData,
  } = useContractWrite({
    ...depositConfig,
    onSuccess: (data) => {
      setTransferStatus({
        loading: true,
        step: "depositing",
        approved: true,
      });

      logTransaction({
        user: address,
        userRole: userRole,
        address: contractAddresses.Regulator,
        description: `Deposited property #${nft.id} into escrow`,
        hash: data.hash,
      });

      // After transaction is submitted, update UI to show success
      setTimeout(() => {
        setTransferStatus({
          loading: false,
          step: "deposit-success",
          approved: true,
        });

        // Refresh the UI after a brief delay to allow viewing success state
        setTimeout(() => {
          onRefresh?.(); // Call the refresh callback if provided
        }, 2000);
      }, 3000);
    },
    onError: (error) => {
      console.error("Error depositing NFT:", error);
      setTransferStatus({ loading: false, step: "deposit-error" });
    },
  });

  // Handler functions for approval and deposit
  const handleApproveNFT = () => {
    approveNFT?.();
  };

  const handleDepositNFT = () => {
    // Check if already approved directly from blockchain data
    if (
      approvalStatus &&
      approvalStatus.toLowerCase() === contractAddresses.Regulator.toLowerCase()
    ) {
      // Already approved, proceed to deposit
      depositNFT?.();
    } else {
      // Need approval first
      approveNFT?.();
    }
  };

  // Update transferStatus when approvalStatus changes
  useEffect(() => {
    if (
      approvalStatus &&
      approvalStatus.toLowerCase() === contractAddresses.Regulator.toLowerCase()
    ) {
      console.log(
        `Found approval for token ${nft.id} from blockchain, updating state`
      );
      setTransferStatus((prev) => ({
        ...prev,
        approved: true,
        step: prev.step === "approving" ? "approved" : prev.step,
      }));
    }
  }, [approvalStatus, nft.id]);

  const renderButtons = () => {
    if (!nft.isOwnedByUser) return null;

    if (nft.isInVault) {
      return (
        <div className="mt-2 text-sm text-gray-500">
          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-md">
            Tokenized in Vault
          </span>
        </div>
      );
    }

    // If NFT is pending deposit, show deposit controls
    if (isPendingDeposit) {
      return (
        <div className="mt-3 grid grid-cols-1 gap-2">
          <p className="text-xs text-gray-600 mb-1">
            Listed for {formatEther(pendingInfo.price)}Mn AED
          </p>
          {isBeingProcessed ? (
            <button
              className={`w-full py-2 px-3 rounded cursor-not-allowed text-sm flex items-center justify-center ${
                transferStatus.step === "depositing"
                  ? "bg-yellow-500 text-white"
                  : "bg-gray-300 text-gray-700"
              }`}
              disabled
            >
              {transferStatus.step === "approving" && "Approving..."}
              {transferStatus.step === "approved" && "Approved!"}
              {transferStatus.step === "depositing" && (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Depositing to Escrow...
                </>
              )}
              {transferStatus.step === "approval-timeout" &&
                "Approval taking too long"}
            </button>
          ) : transferStatus.step === "deposit-success" ? (
            <button
              className="w-full py-2 px-3 bg-green-600 text-white rounded text-sm flex items-center justify-center"
              disabled
            >
              <svg
                className="h-4 w-4 mr-1"
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
              Deposited Successfully!
            </button>
          ) : transferStatus.step === "deposit-error" ? (
            <div className="space-y-2">
              <div className="text-xs text-red-600">
                Failed to deposit. Please try again.
              </div>
              <button
                onClick={handleDepositNFT}
                className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm"
              >
                Retry Deposit
              </button>
            </div>
          ) : transferStatus.approved ? (
            <button
              onClick={handleDepositNFT}
              className="w-full py-2 px-3 bg-green-600 hover:bg-green-700 text-white rounded transition-colors text-sm"
            >
              Deposit to Escrow
            </button>
          ) : (
            <button
              onClick={handleApproveNFT}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm"
            >
              Approve Transfer
            </button>
          )}
          {transferStatus.step === "approval-timeout" && (
            <button
              onClick={handleApproveNFT}
              className="w-full py-2 px-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded transition-colors text-sm"
            >
              Retry Approval
            </button>
          )}
        </div>
      );
    }

    // Default action buttons for owned NFTs
    return (
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={handleOpenSellModal}
          className="col-span-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm"
        >
          Sell
        </button>
      </div>
    );
  };

  return (
    <div
      className={`border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
        nft.isInVault
          ? "border-purple-300 bg-purple-50"
          : nft.isOwnedByUser
          ? "border-green-300 bg-green-50"
          : nft.owner?.toLowerCase() === contractAddresses.admin?.toLowerCase()
          ? "border-blue-300 bg-blue-50"
          : "border-orange-300 bg-orange-50"
      }`}
    >
      <div className="h-48 bg-gray-200 relative">
        <Image
          src={nft.image || "/images/placeholder-property.jpg"}
          alt={nft.name}
          fill
          className="object-cover"
          onError={(e) => {
            e.target.onError = null;
            e.target.src = "/images/placeholder-property.jpg";
          }}
        />
        <div className="absolute top-2 right-2 flex space-x-1">
          {nft.isInVault ? (
            <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
              In Vault
            </span>
          ) : nft.isOwnedByUser ? (
            <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
              You Own
            </span>
          ) : nft.owner?.toLowerCase() ===
            contractAddresses.admin?.toLowerCase() ? (
            <></>
          ) : (
            <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded-full">
              Other Owner
            </span>
          )}

          {pendingListings && pendingListings[nft.id] && (
            <span className="bg-yellow-600 text-white text-xs px-2 py-1 rounded-full">
              Awaiting Deposit
            </span>
          )}
        </div>
      </div>
      <div className="p-4">
        <h4 className="font-semibold text-lg mb-1">{nft.name}</h4>
        <p className="text-gray-600 text-sm mb-2">{nft.description}</p>
        <div className="text-xs text-gray-500 mb-3">Token ID: {nft.id}</div>

        {viewMode === "all" && nft.owner && (
          <div className="text-xs text-gray-500 mb-3">
            Owner:{" "}
            <span className="font-mono">
              {nft.owner.substring(0, 6)}...
              {nft.owner.substring(nft.owner.length - 4)}
            </span>
          </div>
        )}

        {nft.isInVault && (
          <div className="text-xs text-purple-600 font-medium mb-3">
            Tokens Minted: {Number(nft.tokenAmount) / 10 ** 18} REBT
          </div>
        )}

        {nft.attributes && nft.attributes.length > 0 && (
          <div className="mt-2">
            <div className="grid grid-cols-2 gap-2">
              {nft.attributes
                .filter((attr) => attr.trait_type && attr.value)
                .map((attr, index) => (
                  <div key={index} className="text-xs">
                    <span className="text-gray-500">{attr.trait_type}:</span>{" "}
                    <span className="font-medium">{attr.value}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {renderButtons()}
      </div>

      {/* Sell Modal */}
      <NFTSellModal
        isOpen={isSellModalOpen}
        onClose={handleCloseSellModal}
        nft={nft}
      />
    </div>
  );
}
