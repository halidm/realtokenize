"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useContractWrite,
  useContractRead,
  usePrepareContractWrite,
} from "wagmi";
import { readContract } from "@wagmi/core";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Loader } from "@/components/ui/Loader";
import VaultABI from "@/contracts/Vault.json";
import BasketTokenABI from "@/contracts/BasketToken.json";
import RegulatorABI from "@/contracts/Regulator.json";
import RealEstateNFTABI from "@/contracts/RealEstateNFT.json";
import contractAddresses from "@/contracts/addresses.json";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

export default function VaultWithdrawForm({ addTransaction, onSuccess }) {
  const { address, isConnected } = useAccount();
  const [vaultedNFTs, setVaultedNFTs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedVaultedNFT, setSelectedVaultedNFT] = useState("");
  const [isPreparingWithdrawal, setIsPreparingWithdrawal] = useState(false);
  const [needsTokenApproval, setNeedsTokenApproval] = useState(false);
  const [needsRegulatorApproval, setNeedsRegulatorApproval] = useState(true);
  const [selectedNFTDetails, setSelectedNFTDetails] = useState(null);
  const [withdrawStep, setWithdrawStep] = useState("initial"); // initial, tokens-approved, regulator-requested, regulator-approved

  // Fetch vaulted NFTs for redemption
  useEffect(() => {
    const fetchVaultedNFTs = async () => {
      if (!isConnected || !address) return;

      try {
        setLoading(true);
        setError(null);

        // Get total supply of NFTs
        const totalSupply = await readContract({
          address: contractAddresses.RealEstateNFT,
          abi: RealEstateNFTABI,
          functionName: "totalSupply",
        });

        const totalSupplyNumber = Number(totalSupply);
        const nfts = [];

        // Check each NFT to see if it's in the vault
        for (let i = 0; i < totalSupplyNumber; i++) {
          try {
            // Get token ID at index i
            const tokenId = await readContract({
              address: contractAddresses.RealEstateNFT,
              abi: RealEstateNFTABI,
              functionName: "tokenByIndex",
              args: [i],
            });

            // Check if NFT is in vault
            const isInVault = await readContract({
              address: contractAddresses.Vault,
              abi: VaultABI,
              functionName: "isNFTVaulted",
              args: [tokenId],
            });

            if (isInVault) {
              // Get token amount
              const tokenAmount = await readContract({
                address: contractAddresses.Vault,
                abi: VaultABI,
                functionName: "getTokenAmount",
                args: [tokenId],
              });

              // Get token URI for metadata
              const tokenURI = await readContract({
                address: contractAddresses.RealEstateNFT,
                abi: RealEstateNFTABI,
                functionName: "tokenURI",
                args: [tokenId],
              });

              // Parse metadata
              let name = `Property #${tokenId}`;
              try {
                if (tokenURI.startsWith("data:application/json;base64,")) {
                  const base64Data = tokenURI.replace(
                    "data:application/json;base64,",
                    ""
                  );
                  const jsonString = atob(base64Data);
                  const metadata = JSON.parse(jsonString);
                  name = metadata.name || name;
                }
              } catch (error) {
                console.error("Error parsing metadata:", error);
              }

              nfts.push({
                id: tokenId.toString(),
                name: name,
                tokenAmount: tokenAmount.toString(),
                formattedAmount: (
                  Number(tokenAmount) /
                  10 ** 18
                ).toLocaleString(),
              });
            }
          } catch (error) {
            console.error(`Error checking NFT ${i}:`, error);
          }
        }

        setVaultedNFTs(nfts);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching vaulted NFTs:", error);
        setError("Failed to fetch vaulted NFTs. Please try again.");
        setLoading(false);
      }
    };

    fetchVaultedNFTs();
  }, [address, isConnected]);

  // Get user's token balance
  const { data: tokenBalance } = useContractRead({
    address: contractAddresses.BasketToken,
    abi: BasketTokenABI,
    functionName: "balanceOf",
    args: [address],
    watch: true,
    enabled: isConnected && !!address,
  });

  // Check token allowance when an NFT is selected
  const { data: tokenAllowance, refetch: refetchAllowance } = useContractRead({
    address: contractAddresses.BasketToken,
    abi: BasketTokenABI,
    functionName: "allowance",
    args: [address, contractAddresses.Vault],
    enabled: !!selectedVaultedNFT && !!address,
  });

  // Effect to check if token approval is needed
  useEffect(() => {
    if (tokenAllowance && selectedNFTDetails?.tokenAmount) {
      setNeedsTokenApproval(
        BigInt(tokenAllowance) < BigInt(selectedNFTDetails.tokenAmount)
      );

      if (BigInt(tokenAllowance) >= BigInt(selectedNFTDetails.tokenAmount)) {
        setWithdrawStep((prev) =>
          prev === "initial" ? "tokens-approved" : prev
        );
      }
    }
  }, [tokenAllowance, selectedNFTDetails]);

  // Check if regulator has approved the transfer
  const { data: regulatorApproval, refetch: refetchRegulatorApproval } =
    useContractRead({
      address: contractAddresses.Regulator,
      abi: RegulatorABI,
      functionName: "isTransferApproved",
      args: [selectedVaultedNFT, contractAddresses.Vault, address],
      enabled: !!selectedVaultedNFT && !!address && !needsTokenApproval,
    });

  // Effect to check regulator approval
  useEffect(() => {
    if (regulatorApproval !== undefined) {
      setNeedsRegulatorApproval(!regulatorApproval);

      if (regulatorApproval) {
        setWithdrawStep("regulator-approved");
      } else if (!needsTokenApproval) {
        // If tokens are approved but regulator hasn't approved, set to tokens-approved step
        setWithdrawStep("tokens-approved");
      }
    }
  }, [regulatorApproval, needsTokenApproval]);

  // Approve tokens for transfer
  const { config: approveTokensConfig } = usePrepareContractWrite({
    address: contractAddresses.BasketToken,
    abi: BasketTokenABI,
    functionName: "approve",
    args: [contractAddresses.Vault, selectedNFTDetails?.tokenAmount || "0"],
    enabled: !!selectedVaultedNFT && needsTokenApproval && !!selectedNFTDetails,
  });

  const {
    write: approveTokens,
    isLoading: isApprovingTokens,
    data: approveTokensData,
  } = useContractWrite({
    ...approveTokensConfig,
    onSuccess: (data) => {
      addTransaction({
        hash: data.hash,
        description: `Approved REBT tokens for vault withdrawal`,
      });

      setSuccess(
        "Tokens approved successfully. Please wait for the transaction to be confirmed."
      );

      // Wait for approval to be confirmed
      const checkInterval = setInterval(async () => {
        try {
          const result = await refetchAllowance();
          if (
            result.data &&
            selectedNFTDetails?.tokenAmount &&
            BigInt(result.data) >= BigInt(selectedNFTDetails.tokenAmount)
          ) {
            clearInterval(checkInterval);
            setNeedsTokenApproval(false);
            setWithdrawStep("tokens-approved");
            setSuccess(
              "Token approval confirmed. You can now request regulator approval."
            );
          }
        } catch (error) {
          console.error("Error checking token allowance:", error);
        }
      }, 3000);

      // Safety timeout
      setTimeout(() => clearInterval(checkInterval), 30000);
    },
    onError: (error) => {
      console.error("Error approving tokens:", error);
      setError(`Failed to approve tokens: ${error.message}`);
    },
  });

  // Request regulator approval - this is kept for background checking but isn't directly used by users
  const { config: requestRegulatorConfig } = usePrepareContractWrite({
    address: contractAddresses.Regulator,
    abi: RegulatorABI,
    functionName: "requestTransferApproval",
    args: [selectedVaultedNFT, address],
    enabled: false, // Disabled as users can't directly use this
    onError: (error) => {
      console.error("Error preparing regulator approval request:", error);
    },
  });

  // Withdraw NFT from vault
  const { config: withdrawConfig, error: withdrawPrepError } =
    usePrepareContractWrite({
      address: contractAddresses.Vault,
      abi: VaultABI,
      functionName: "redeemNFT",
      args: [selectedVaultedNFT],
      enabled:
        !!selectedVaultedNFT && !needsTokenApproval && !needsRegulatorApproval,
      onError: (error) => {
        console.error("Error preparing withdrawal:", error);
        setError(`Failed to prepare withdrawal: ${error.message}`);
        setIsPreparingWithdrawal(false);
      },
    });

  const {
    write: withdrawNFT,
    isLoading: isWithdrawing,
    data: withdrawData,
  } = useContractWrite({
    ...withdrawConfig,
    onSuccess: (data) => {
      addTransaction({
        hash: data.hash,
        description: `Withdrawn NFT #${selectedVaultedNFT} from vault`,
      });

      setSuccess(
        `NFT #${selectedVaultedNFT} withdrawal initiated. Please wait for the transaction to complete.`
      );
      setIsPreparingWithdrawal(false);

      // Reset form after successful withdrawal (after a delay)
      setTimeout(() => {
        setSelectedVaultedNFT("");
        setSelectedNFTDetails(null);
        setWithdrawStep("initial");
        onSuccess?.();
      }, 5000);
    },
    onError: (error) => {
      console.error("Error withdrawing NFT:", error);
      setError(`Failed to withdraw NFT: ${error.message}`);
      setIsPreparingWithdrawal(false);
    },
  });

  // Handle NFT selection
  const handleNFTChange = (e) => {
    const nftId = e.target.value;
    setSelectedVaultedNFT(nftId);
    setError(null);
    setSuccess(null);

    // Reset to initial state when changing NFTs
    setWithdrawStep("initial");
    setNeedsTokenApproval(true); // Default to needing approval until we check
    setNeedsRegulatorApproval(true);

    if (nftId) {
      const nftDetails = vaultedNFTs.find((nft) => nft.id === nftId);
      setSelectedNFTDetails(nftDetails);

      // Trigger allowance and regulator approval checks
      refetchAllowance();
      if (withdrawStep === "tokens-approved") {
        refetchRegulatorApproval();
      }
    } else {
      setSelectedNFTDetails(null);
    }
  };

  // For direct admin approval (for development purposes)
  const { config: adminApproveConfig } = usePrepareContractWrite({
    address: contractAddresses.Regulator,
    abi: RegulatorABI,
    functionName: "approveTransfer",
    args: [selectedVaultedNFT, contractAddresses.Vault, address],
    enabled: !!selectedVaultedNFT && process.env.NODE_ENV !== "production",
    onError: (error) => {
      console.error("Error preparing admin approval:", error);
      setError(`Admin approval prep error: ${error.message}`);
    },
  });

  const { write: adminApproveTransfer, isLoading: isAdminApproving } =
    useContractWrite({
      ...adminApproveConfig,
      onSuccess: (data) => {
        addTransaction({
          hash: data.hash,
          description: `Admin approved NFT #${selectedVaultedNFT} withdrawal (dev only)`,
        });

        setSuccess("Transfer approved by admin. You can now withdraw the NFT.");

        // Check if approval was successful
        setTimeout(async () => {
          const result = await refetchRegulatorApproval();
          if (result.data) {
            setNeedsRegulatorApproval(false);
            setWithdrawStep("regulator-approved");
          }
        }, 2000);
      },
      onError: (error) => {
        console.error("Error in admin approval:", error);
        setError(`Admin approval failed: ${error.message}`);
      },
    });

  // For development purposes - to simulate approval when there are contract ownership issues
  const handleForceApprove = () => {
    if (adminApproveTransfer) {
      adminApproveTransfer();
    } else {
      // For development, we can bypass the approval check entirely
      setNeedsRegulatorApproval(false);
      setWithdrawStep("regulator-approved");
      setSuccess(
        "Developer override: Transfer approved. You can now withdraw the NFT."
      );
    }
  };

  // Handle token approval
  const handleApproveTokens = () => {
    if (!selectedVaultedNFT) {
      setError("Please select an NFT first");
      return;
    }

    setError(null);
    setSuccess(null);

    if (approveTokens) {
      approveTokens();
    } else {
      setError(
        "Approval function not available. Please try again in a moment."
      );
    }
  };

  // Handle regulator approval request
  const handleRequestRegulator = () => {
    if (!selectedVaultedNFT) {
      setError("Please select an NFT first");
      return;
    }

    // Show an informative message about why we can't directly request approval
    setError(
      "For vault withdrawals, you cannot directly request approval. An admin must approve the transfer."
    );
  };

  // Handle withdraw
  const handleWithdraw = () => {
    if (!selectedVaultedNFT) {
      setError("Please select an NFT first");
      return;
    }

    if (withdrawStep !== "regulator-approved") {
      setError("Please complete all approval steps first");
      return;
    }

    // Check token balance
    if (tokenBalance && selectedNFTDetails?.tokenAmount) {
      if (BigInt(tokenBalance) < BigInt(selectedNFTDetails.tokenAmount)) {
        setError(
          `You need ${
            selectedNFTDetails.formattedAmount
          } REBT tokens to withdraw this NFT. Your balance: ${(
            Number(tokenBalance) /
            10 ** 18
          ).toLocaleString()} REBT`
        );
        return;
      }
    }

    setError(null);
    setSuccess(null);
    setIsPreparingWithdrawal(true);

    if (withdrawNFT) {
      withdrawNFT();
    } else {
      setError(
        "Withdrawal function not available. Please try again in a moment."
      );
      setIsPreparingWithdrawal(false);
    }
  };

  // Get the current action button
  const renderActionButton = () => {
    if (needsTokenApproval) {
      return (
        <Button
          onClick={handleApproveTokens}
          disabled={isApprovingTokens || !selectedVaultedNFT}
          className="px-4 py-2"
        >
          {isApprovingTokens ? (
            <>
              <Loader size="sm" className="mr-2" />
              Approving Tokens...
            </>
          ) : (
            "Approve Tokens"
          )}
        </Button>
      );
    }

    if (needsRegulatorApproval && !needsTokenApproval) {
      // In a production environment, we would normally just show a waiting message
      // since the user cannot directly request approval for vault withdrawals
      return (
        <Button disabled={true} className="px-4 py-2">
          Waiting for Regulator Approval
        </Button>
      );
    }

    if (withdrawStep === "regulator-approved") {
      return (
        <Button
          variant="destructive"
          onClick={handleWithdraw}
          disabled={
            isWithdrawing || !selectedVaultedNFT || isPreparingWithdrawal
          }
          className="px-4 py-2"
        >
          {isWithdrawing || isPreparingWithdrawal ? (
            <>
              <Loader size="sm" className="mr-2" />
              {isPreparingWithdrawal ? "Preparing..." : "Withdrawing..."}
            </>
          ) : (
            "Withdraw NFT"
          )}
        </Button>
      );
    }

    // If nothing is selected, show a disabled button
    if (!selectedVaultedNFT) {
      return (
        <Button disabled={true} className="px-4 py-2">
          Select an NFT to continue
        </Button>
      );
    }

    // Fallback button when no other conditions are met
    return (
      <Button disabled={true} className="px-4 py-2">
        Processing...
      </Button>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdraw NFT from Vault</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select NFT to Withdraw
          </label>
          <select
            value={selectedVaultedNFT}
            onChange={handleNFTChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            disabled={
              loading ||
              vaultedNFTs.length === 0 ||
              isWithdrawing ||
              isApprovingTokens ||
              isAdminApproving
            }
          >
            <option value="">Select an NFT</option>
            {vaultedNFTs.map((nft) => (
              <option key={nft.id} value={nft.id}>
                {nft.name} (ID: {nft.id}) - {nft.formattedAmount} REBT
              </option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="text-center py-4">
            <Loader size="md" className="mx-auto" />
            <p className="mt-2 text-gray-600">Loading vaulted NFTs...</p>
          </div>
        )}

        {vaultedNFTs.length === 0 && !loading && (
          <div className="text-center py-4 text-gray-500">
            There are no NFTs in the vault to withdraw.
          </div>
        )}

        {selectedNFTDetails && (
          <div className="mb-4 p-4 bg-gray-100 rounded-md">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Property</span>
                <span className="text-sm">{selectedNFTDetails.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Token ID</span>
                <span className="text-sm">{selectedNFTDetails.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Tokens to Burn</span>
                <span className="text-sm font-semibold text-red-600">
                  {selectedNFTDetails.formattedAmount} REBT
                </span>
              </div>
            </div>
          </div>
        )}

        {selectedVaultedNFT && (
          <div className="my-4 border border-gray-200 rounded-md p-3 bg-gray-50">
            <h4 className="text-sm font-medium mb-2">Withdrawal Process:</h4>
            <ol className="space-y-2 text-xs">
              <li
                className={`flex items-center ${
                  needsTokenApproval
                    ? "text-blue-600 font-medium"
                    : "text-gray-500 line-through"
                }`}
              >
                <span className="mr-2">1.</span> Approve token burning
                {!needsTokenApproval && (
                  <span className="ml-2 text-green-500">✓</span>
                )}
              </li>
              <li
                className={`flex items-center ${
                  needsRegulatorApproval
                    ? "text-blue-600 font-medium"
                    : "text-gray-500 line-through"
                }`}
              >
                <span className="mr-2">2.</span> Regulator approval
                {!needsRegulatorApproval && (
                  <span className="ml-2 text-green-500">✓</span>
                )}
              </li>
              <li
                className={`flex items-center ${
                  withdrawStep === "regulator-approved"
                    ? "text-blue-600 font-medium"
                    : "text-gray-500"
                }`}
              >
                <span className="mr-2">3.</span> Execute withdrawal
              </li>
            </ol>
          </div>
        )}

        {selectedVaultedNFT &&
          needsRegulatorApproval &&
          !needsTokenApproval && (
            <Alert variant="info" className="mt-2 mb-4">
              <p className="mb-2">
                <strong>Important:</strong> For vault withdrawals, the regulator
                must directly approve the transfer.
              </p>
              <p className="text-sm text-gray-600">
                This is because the NFT is currently owned by the vault
                contract, not by you. An admin must approve this withdrawal.
              </p>
            </Alert>
          )}

        {selectedVaultedNFT && (
          <Alert variant="warning" className="mt-2 mb-4">
            Important: You must have {selectedNFTDetails?.formattedAmount} REBT
            tokens in your wallet to execute this withdrawal. The redeemNFT
            function will burn these tokens and transfer the NFT back to you.
          </Alert>
        )}

        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        {/* Development tools */}
        {process.env.NODE_ENV !== "production" &&
          selectedVaultedNFT &&
          needsRegulatorApproval &&
          !needsTokenApproval && (
            <div className="mt-4 p-2 bg-gray-100 border border-gray-300 rounded-md">
              <p className="text-xs text-gray-700 mb-2">Development Tools:</p>
              <div className="flex flex-col space-y-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleForceApprove}
                  disabled={isAdminApproving}
                >
                  {isAdminApproving ? (
                    <>
                      <Loader size="xs" className="mr-1" />
                      Approving...
                    </>
                  ) : (
                    "Force Approve (Dev Override)"
                  )}
                </Button>
                <p className="text-xs text-gray-600 mt-1">
                  This will override the approval state for development testing.
                </p>
              </div>
            </div>
          )}

        {/* Action buttons */}
        <div className="flex gap-2 justify-end">{renderActionButton()}</div>
      </CardContent>
    </Card>
  );
}
