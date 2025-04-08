"use client";

import { useState, useEffect } from "react";
import {
  useContractRead,
  useContractWrite,
  usePrepareContractWrite,
} from "wagmi";
import RegulatorABI from "@/contracts/Regulator.json";
import contractAddresses from "@/contracts/addresses.json";
import Image from "next/image";
import { formatAddress } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Loader } from "@/components/ui/Loader";
import { useUser } from "@/context/UserContext";
import { fetchNFTMetadata } from "@/lib/nftUtils";
import { useTransactions } from "@/context/TransactionContext";

export default function PendingTransfers({ filter = "all" }) {
  const { isRegulator, address, userRole } = useUser();
  const { logTransaction } = useTransactions();
  const [pendingTransfers, setPendingTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isContractOwner, setIsContractOwner] = useState(false);

  // Get contract owner
  const { data: contractOwner } = useContractRead({
    address: contractAddresses.Regulator,
    abi: RegulatorABI,
    functionName: "owner",
    watch: true,
  });

  // Check if current user is contract owner
  useEffect(() => {
    if (contractOwner && address) {
      setIsContractOwner(contractOwner.toLowerCase() === address.toLowerCase());
    }
  }, [contractOwner, address]);

  // Use contract read hook for pending transfers
  const { data: pendingTransfersData, refetch: refetchTransfers } =
    useContractRead({
      address: contractAddresses.Regulator,
      abi: RegulatorABI,
      functionName: "getPendingTransfers",
      watch: true,
    });

  // Effect to process pending transfers data
  useEffect(() => {
    const processTransfers = async () => {
      if (!pendingTransfersData) return;

      try {
        setLoading(true);
        const transfers = await Promise.all(
          pendingTransfersData.map(async (transfer) => {
            const metadata = await fetchNFTMetadata(transfer.tokenId);
            return {
              tokenId: transfer.tokenId,
              from: transfer.from,
              to: transfer.to,
              approved: transfer.approved,
              isVaultTransfer:
                transfer.to.toLowerCase() ===
                contractAddresses.Vault.toLowerCase(),
              ...metadata,
            };
          })
        );

        setPendingTransfers(transfers);
        setError(null);
      } catch (error) {
        console.error("Error processing transfers:", error);
        setError("Failed to load pending transfers. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    processTransfers();
  }, [pendingTransfersData]);

  // Contract write to approve transfer
  const { config: approveConfig } = usePrepareContractWrite({
    address: contractAddresses.Regulator,
    abi: RegulatorABI,
    functionName: "approveTransfer",
    args: selectedTransfer
      ? [selectedTransfer.tokenId, selectedTransfer.from, selectedTransfer.to]
      : undefined,
    enabled: !!selectedTransfer && isContractOwner,
  });

  const { write: approveTransfer, isLoading: isApproving } = useContractWrite({
    ...approveConfig,
    onSuccess: (data) => {
      const successMessage = `Transfer of NFT #${selectedTransfer.tokenId} approved. Transaction hash: ${data.hash}`;
      setSuccess(successMessage);

      // Log the transaction to our centralized system
      logTransaction({
        user: address,
        userRole: userRole,
        address: contractAddresses.Regulator,
        description: `Approved transfer of NFT #${
          selectedTransfer.tokenId
        } from ${formatAddress(selectedTransfer.from)} to ${formatAddress(
          selectedTransfer.to
        )}`,
        hash: data.hash,
      });

      setSelectedTransfer(null);

      // Refetch after a delay to allow the blockchain to update
      setTimeout(() => {
        refetchTransfers();
      }, 3000);
    },
    onError: (error) => {
      console.error("Error approving transfer:", error);
      const errorMessage =
        error && typeof error === "object"
          ? error.message || error.reason || "Unknown error"
          : "Unknown error occurred";

      setError(`Failed to approve transfer: ${errorMessage}`);
      setSelectedTransfer(null);
    },
  });

  // Handle approve action
  const handleApprove = (transfer) => {
    if (!isContractOwner) {
      setError("Only the contract owner can approve transfers.");
      return;
    }
    setSelectedTransfer(transfer);
    approveTransfer?.();
  };

  // Get filtered transfers
  const filteredTransfers = pendingTransfers.filter((transfer) => {
    if (filter === "all") return true;
    if (filter === "vault") return transfer.isVaultTransfer;
    return true;
  });

  if (!isRegulator) {
    return (
      <Alert variant="warning" className="mb-4">
        You need to be a regulator to access this page.
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader size="lg" />
        <span className="ml-2">Loading pending transfers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!isContractOwner && (
        <Alert variant="warning" className="mt-4">
          You are not the contract owner.
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="mb-4">
          {success}
        </Alert>
      )}
      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}
      {filteredTransfers.length === 0 ? (
        <Alert variant="info">No pending requests to review.</Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTransfers.map((transfer) => (
            <Card
              key={`${transfer.tokenId}-${transfer.to}`}
              className="overflow-hidden"
            >
              <div className="h-48 bg-gray-200 relative">
                <Image
                  src={transfer.image}
                  alt={transfer.name}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/images/placeholder-property.jpg";
                  }}
                />
              </div>
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold mb-2">{transfer.name}</h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {transfer.description}
                </p>
                <div className="text-sm mb-2 space-y-1">
                  <p>
                    <span className="font-medium">Token ID:</span>{" "}
                    {transfer.tokenId.toString()}
                  </p>
                  <p>
                    <span className="font-medium">From:</span>{" "}
                    {formatAddress(transfer.from)}
                  </p>
                  <p>
                    <span className="font-medium">To:</span>{" "}
                    {transfer.isVaultTransfer ? (
                      <span className="text-blue-600 font-medium">VAULT</span>
                    ) : (
                      formatAddress(transfer.to)
                    )}
                  </p>

                  {transfer.isVaultTransfer && (
                    <div className="mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded inline-block">
                      Vault Deposit Request
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => handleApprove(transfer)}
                    disabled={
                      !isContractOwner ||
                      (isApproving &&
                        selectedTransfer?.tokenId === transfer.tokenId)
                    }
                    variant={isContractOwner ? "success" : "outline"}
                    className="w-full"
                  >
                    {isApproving &&
                    selectedTransfer?.tokenId === transfer.tokenId ? (
                      <>
                        <Loader size="sm" className="mr-2" />
                        Approving...
                      </>
                    ) : isContractOwner ? (
                      "Approve Transfer"
                    ) : (
                      "View Only"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
