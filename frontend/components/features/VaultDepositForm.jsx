"use client";

import { useState, useEffect } from "react";
import {
  useContractRead,
  useContractWrite,
  usePrepareContractWrite,
} from "wagmi";
import { readContract } from "@wagmi/core";
import { useUser } from "@/context/UserContext";
import RealEstateNFTABI from "@/contracts/RealEstateNFT.json";
import VaultABI from "@/contracts/Vault.json";
import RegulatorABI from "@/contracts/Regulator.json";
import contractAddresses from "@/contracts/addresses.json";
import { Alert } from "@/components/ui/Alert";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

export function VaultDepositForm({ onSuccess = () => {} }) {
  const { address, isConnected, isRegulator } = useUser();
  const [selectedNFT, setSelectedNFT] = useState("");
  const [tokenAmount, setTokenAmount] = useState("10000"); // Default value
  const [ownedNFTs, setOwnedNFTs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [step, setStep] = useState("initial");

  // Fetch owned NFTs
  useEffect(() => {
    const fetchOwnedNFTs = async () => {
      if (!isConnected || !address) return;

      try {
        setLoading(true);
        setError(null);

        // Get balance of NFTs owned by the user
        const balance = await readContract({
          address: contractAddresses.RealEstateNFT,
          abi: RealEstateNFTABI,
          functionName: "balanceOf",
          args: [address],
        });

        const balanceNumber = Number(balance);
        const nfts = [];

        for (let i = 0; i < balanceNumber; i++) {
          // Get token ID at index i
          const tokenId = await readContract({
            address: contractAddresses.RealEstateNFT,
            abi: RealEstateNFTABI,
            functionName: "tokenOfOwnerByIndex",
            args: [address, i],
          });

          // Get token URI
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
          });
        }

        setOwnedNFTs(nfts);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching owned NFTs:", error);
        setError("Failed to fetch your NFTs. Please try again.");
        setLoading(false);
      }
    };

    fetchOwnedNFTs();
  }, [address, isConnected]);

  // Check if NFT is approved for transfer to vault
  const { data: approvalAddress } = useContractRead({
    address: contractAddresses.RealEstateNFT,
    abi: RealEstateNFTABI,
    functionName: "getApproved",
    args: [selectedNFT],
    enabled: !!selectedNFT,
    watch: true,
  });

  const isApproved = approvalAddress === contractAddresses.Vault;

  // Check if transfer is approved by regulator
  const { data: regulatorApproval, refetch: refetchRegulatorApproval } =
    useContractRead({
      address: contractAddresses.Regulator,
      abi: RegulatorABI,
      functionName: "isTransferApproved",
      args: [selectedNFT, address, contractAddresses.Vault],
      enabled: !!selectedNFT && isApproved,
      watch: true,
    });

  const isApprovedByRegulator = regulatorApproval === true;

  // Approve NFT for transfer to vault
  const { config: approveConfig } = usePrepareContractWrite({
    address: contractAddresses.RealEstateNFT,
    abi: RealEstateNFTABI,
    functionName: "approve",
    args: [contractAddresses.Vault, selectedNFT],
    enabled: !!selectedNFT && !isApproved,
  });

  const {
    write: approveNFT,
    isLoading: isApproving,
    isSuccess: isApproveSuccess,
  } = useContractWrite({
    ...approveConfig,
    onSuccess: (data) => {
      setStep("approving");
      setSuccess(
        "NFT approval transaction submitted. Please wait for confirmation."
      );

      // You would typically add this to a transaction log
      console.log("Approval transaction:", data.hash);
    },
    onError: (error) => {
      console.error("Error approving NFT:", error);
      // Safe error message extraction
      const errorMessage =
        error && typeof error === "object"
          ? error.message || error.reason || "Unknown error"
          : "Unknown error occurred";

      setError(`Failed to approve NFT: ${errorMessage}`);
      setStep("initial");
    },
  });

  // Request regulator approval
  const { config: requestApprovalConfig } = usePrepareContractWrite({
    address: contractAddresses.Regulator,
    abi: RegulatorABI,
    functionName: "requestTransferApproval",
    args: [selectedNFT, contractAddresses.Vault],
    enabled: !!selectedNFT && isApproved && !isApprovedByRegulator,
  });

  const {
    write: requestApproval,
    isLoading: isRequestingApproval,
    isSuccess: isRequestSuccess,
  } = useContractWrite({
    ...requestApprovalConfig,
    onSuccess: (data) => {
      setStep("requesting");
      setSuccess("Regulator approval requested. Please wait for confirmation.");

      console.log("Request approval transaction:", data.hash);
    },
    onError: (error) => {
      console.error("Error requesting regulator approval:", error);
      // Safe error message extraction
      const errorMessage =
        error && typeof error === "object"
          ? error.message || error.reason || "Unknown error"
          : "Unknown error occurred";

      setError(`Failed to request regulator approval: ${errorMessage}`);
      setStep("approved");
    },
  });

  // Approve vault transfer (for regulator role)
  const { config: regulatorApproveConfig } = usePrepareContractWrite({
    address: contractAddresses.Regulator,
    abi: RegulatorABI,
    functionName: "approveTransfer",
    args: [selectedNFT, address, contractAddresses.Vault],
    enabled:
      !!selectedNFT && isRegulator && isApproved && !isApprovedByRegulator,
  });

  const {
    write: regulatorApprove,
    isLoading: isRegulatorApproving,
    isSuccess: isRegulatorApproveSuccess,
  } = useContractWrite({
    ...regulatorApproveConfig,
    onSuccess: (data) => {
      setSuccess("Transfer approved by regulator. Refresh to update status.");

      console.log("Regulator approval transaction:", data.hash);
      setTimeout(() => {
        refetchRegulatorApproval();
      }, 3000);
    },
    onError: (error) => {
      console.error("Error approving as regulator:", error);
      const errorMessage =
        error && typeof error === "object"
          ? error.message || error.reason || "Unknown error"
          : "Unknown error occurred";

      setError(`Failed to approve as regulator: ${errorMessage}`);
    },
  });

  // Deposit NFT to vault
  const { config: depositConfig } = usePrepareContractWrite({
    address: contractAddresses.Vault,
    abi: VaultABI,
    functionName: "depositNFT",
    args: [selectedNFT, BigInt(parseFloat(tokenAmount) * 10 ** 18)],
    enabled:
      !!selectedNFT && isApproved && isApprovedByRegulator && !!tokenAmount,
  });

  const {
    write: depositNFT,
    isLoading: isDepositing,
    isSuccess: isDepositSuccess,
  } = useContractWrite({
    ...depositConfig,
    onSuccess: (data) => {
      setStep("depositing");
      setSuccess(
        "NFT deposit transaction submitted. Please wait for confirmation."
      );

      // You would typically add this to a transaction log
      console.log("Deposit transaction:", data.hash);

      // After some time, assume the transaction is complete
      setTimeout(() => {
        setStep("complete");
        setSuccess("NFT successfully deposited to vault!");
        setSelectedNFT("");
        setTokenAmount(tokenAmount);
        onSuccess();
      }, 5000);
    },
    onError: (error) => {
      console.error("Error depositing NFT:", error);
      // Safe error message extraction
      const errorMessage =
        error && typeof error === "object"
          ? error.message || error.reason || "Unknown error"
          : "Unknown error occurred";

      setError(`Failed to deposit NFT: ${errorMessage}`);
      setStep("approved_by_regulator"); // Go back to approved state so they can try again
    },
  });

  // Update step when approval is confirmed
  useEffect(() => {
    if (isApproved && step === "approving") {
      setStep("approved");
      setSuccess(
        "NFT approved! Now request regulator approval before depositing."
      );
    }

    if (
      isApproved &&
      isApprovedByRegulator &&
      (step === "requesting" || step === "approved" || step === "initial")
    ) {
      setStep("approved_by_regulator");
      setSuccess(
        "NFT approved by regulator! You can now deposit it to the vault."
      );
    }
  }, [isApproved, isApprovedByRegulator, step]);

  // Handle NFT selection
  const handleNFTChange = (e) => {
    setSelectedNFT(e.target.value);
    setError(null);
    setSuccess(null);
    setStep("initial");
  };

  // Handle token amount change
  const handleTokenAmountChange = (e) => {
    setTokenAmount(e.target.value);
  };

  // Handle approve button click
  const handleApproveNFT = () => {
    if (!selectedNFT) {
      setError("Please select an NFT to approve.");
      return;
    }

    try {
      setError(null);
      approveNFT?.();
    } catch (err) {
      console.error("Error in approval function:", err);
      const errorMessage =
        err && typeof err === "object"
          ? err.message || err.reason || "Unknown error"
          : "Unknown error occurred";

      setError(`Failed to call approval function: ${errorMessage}`);
    }
  };

  // Handle request regulator approval button click
  const handleRequestApproval = () => {
    if (!selectedNFT || !tokenAmount) {
      setError("Please select an NFT and enter a token amount.");
      return;
    }

    try {
      setError(null);
      requestApproval?.();
    } catch (err) {
      console.error("Error in request approval function:", err);
      const errorMessage =
        err && typeof err === "object"
          ? err.message || err.reason || "Unknown error"
          : "Unknown error occurred";

      setError(`Failed to request approval: ${errorMessage}`);
    }
  };

  // Handle regulator approval button click
  const handleRegulatorApprove = () => {
    if (!selectedNFT) {
      setError("Please select an NFT to approve.");
      return;
    }

    try {
      setError(null);
      regulatorApprove?.();
    } catch (err) {
      console.error("Error in regulator approval function:", err);
      const errorMessage =
        err && typeof err === "object"
          ? err.message || err.reason || "Unknown error"
          : "Unknown error occurred";

      setError(`Failed to approve as regulator: ${errorMessage}`);
    }
  };

  // Handle deposit button click
  const handleDepositNFT = () => {
    if (!selectedNFT || !tokenAmount) {
      setError("Please select an NFT and enter a token amount.");
      return;
    }

    try {
      setError(null);
      depositNFT?.();
    } catch (err) {
      console.error("Error in deposit function:", err);
      const errorMessage =
        err && typeof err === "object"
          ? err.message || err.reason || "Unknown error"
          : "Unknown error occurred";

      setError(`Failed to call deposit function: ${errorMessage}`);
    }
  };

  const isButtonDisabled =
    isApproving ||
    isRequestingApproval ||
    isRegulatorApproving ||
    isDepositing ||
    step === "approving" ||
    step === "requesting" ||
    step === "depositing";

  // Get step status for UI
  const getStepStatus = (stepName) => {
    switch (stepName) {
      case "select":
        return selectedNFT ? "complete" : "current";
      case "approve":
        if (!selectedNFT) return "pending";
        if (isApproved) return "complete";
        if (step === "approving") return "processing";
        return "current";
      case "request":
        if (!selectedNFT || !isApproved) return "pending";
        if (isApprovedByRegulator) return "complete";
        if (step === "requesting") return "processing";
        return "current";
      case "regulator":
        if (!isRegulator) return "hidden";
        if (!selectedNFT || !isApproved || isApprovedByRegulator)
          return "pending";
        return "current";
      case "deposit":
        if (!selectedNFT || !isApproved || !isApprovedByRegulator)
          return "pending";
        if (step === "depositing") return "processing";
        if (step === "complete") return "complete";
        return "current";
      default:
        return "pending";
    }
  };

  // Get step style class
  const getStepClass = (status) => {
    switch (status) {
      case "complete":
        return "text-green-600 line-through";
      case "current":
        return "text-blue-600 font-medium";
      case "processing":
        return "text-orange-500 font-medium";
      case "pending":
        return "text-gray-500";
      case "hidden":
        return "hidden";
      default:
        return "text-gray-500";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deposit NFT to Vault</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select NFT to Deposit
          </label>
          <select
            value={selectedNFT}
            onChange={handleNFTChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            disabled={loading || ownedNFTs.length === 0 || isButtonDisabled}
          >
            <option value="">Select an NFT</option>
            {ownedNFTs.map((nft) => (
              <option key={nft.id} value={nft.id}>
                {nft.name} (ID: {nft.id})
              </option>
            ))}
          </select>
          {loading && (
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <Loader size="sm" className="mr-2" />
              Loading your NFTs...
            </div>
          )}
          {ownedNFTs.length === 0 && !loading && (
            <p className="mt-2 text-sm text-gray-500">
              You don't own any NFTs to deposit.
            </p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Token Amount to Mint
          </label>
          <input
            type="number"
            value={tokenAmount}
            onChange={handleTokenAmountChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Enter token amount"
            min="1"
            disabled={isButtonDisabled}
          />
          <p className="text-xs text-gray-500 mt-1">
            This is the number of basket tokens that will be minted when you
            deposit this NFT.
          </p>
        </div>

        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="mb-4">
            {success}
          </Alert>
        )}

        <div className="mb-6 p-4 bg-blue-50 text-blue-800 rounded-md">
          <h3 className="font-medium mb-2">Deposit Process</h3>
          <ol className="list-decimal ml-5 space-y-3">
            <li className={getStepClass(getStepStatus("select"))}>
              Select an NFT and set token amount
              {getStepStatus("select") === "complete" && (
                <span className="ml-2 text-xs">
                  ✅ NFT #{selectedNFT} selected
                </span>
              )}
            </li>

            <li className={getStepClass(getStepStatus("approve"))}>
              Approve NFT for vault transfer
              {getStepStatus("approve") === "processing" && (
                <span className="ml-2 text-xs">⏳ Processing...</span>
              )}
              {getStepStatus("approve") === "complete" && (
                <span className="ml-2 text-xs">✅ NFT approved</span>
              )}
            </li>

            <li className={getStepClass(getStepStatus("request"))}>
              Request regulator approval
              {getStepStatus("request") === "processing" && (
                <span className="ml-2 text-xs">⏳ Processing...</span>
              )}
              {getStepStatus("request") === "complete" && (
                <span className="ml-2 text-xs">✅ Requested</span>
              )}
            </li>

            <li className={getStepClass(getStepStatus("regulator"))}>
              (Regulator) Approve the transfer
              {getStepStatus("regulator") === "processing" && (
                <span className="ml-2 text-xs">⏳ Processing...</span>
              )}
            </li>

            <li className={getStepClass(getStepStatus("deposit"))}>
              Deposit NFT to vault and mint {tokenAmount} tokens
              {getStepStatus("deposit") === "processing" && (
                <span className="ml-2 text-xs">⏳ Processing...</span>
              )}
              {getStepStatus("deposit") === "complete" && (
                <span className="ml-2 text-xs">✅ Complete</span>
              )}
            </li>
          </ol>

          <div className="mt-4 text-xs text-gray-600">
            <p>
              * The regulator must approve your NFT transfer to the vault before
              deposit can be completed
            </p>
            {isRegulator && (
              <p className="mt-1 text-green-600 font-medium">
                You are logged in as a regulator and can approve transfers
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {step === "initial" && (
            <Button
              onClick={handleApproveNFT}
              disabled={!selectedNFT || isButtonDisabled}
              variant="primary"
              className="flex items-center"
            >
              {isApproving && <Loader size="sm" className="mr-2 text-white" />}
              Approve NFT
            </Button>
          )}

          {step === "approved" && (
            <Button
              onClick={handleRequestApproval}
              disabled={!selectedNFT || !tokenAmount || isButtonDisabled}
              variant="primary"
              className="flex items-center"
            >
              {isRequestingApproval && (
                <Loader size="sm" className="mr-2 text-white" />
              )}
              Request Regulator Approval
            </Button>
          )}

          {isRegulator && step === "approved" && !isApprovedByRegulator && (
            <Button
              onClick={handleRegulatorApprove}
              variant="warning"
              className="flex items-center"
            >
              {isRegulatorApproving && (
                <Loader size="sm" className="mr-2 text-white" />
              )}
              Approve as Regulator
            </Button>
          )}

          {step === "approved_by_regulator" && (
            <Button
              onClick={handleDepositNFT}
              disabled={!selectedNFT || !tokenAmount || isButtonDisabled}
              variant="success"
              className="flex items-center"
            >
              {isDepositing && <Loader size="sm" className="mr-2 text-white" />}
              Deposit NFT
            </Button>
          )}

          {(step === "approving" ||
            step === "requesting" ||
            step === "depositing") && (
            <Button disabled variant="secondary" className="flex items-center">
              <Loader size="sm" className="mr-2 text-white" />
              {step === "approving"
                ? "Approving..."
                : step === "requesting"
                ? "Requesting Approval..."
                : "Depositing..."}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
