"use client";

import { useState, useEffect } from "react";
import {
  useContractWrite,
  usePrepareContractWrite,
  useWaitForTransaction,
} from "wagmi";
import { formatEther, parseEther } from "viem";
import { useUser } from "@/context/UserContext";
import RealEstateNFTABI from "@/contracts/RealEstateNFT.json";
import RegulatorABI from "@/contracts/Regulator.json";
import contractAddresses from "@/contracts/addresses.json";
import { formatAddress } from "@/lib/utils";
import { Dialog } from "@/components/ui/Dialog";
import { Alert } from "@/components/ui/Alert";
import { Loader } from "@/components/ui/Loader";
import { useTransactions } from "@/context/TransactionContext";

export function PaymentModal({ isOpen, onClose, property, onPaymentSuccess }) {
  const { address, userRole } = useUser();
  const { logTransaction } = useTransactions();
  const [paymentStatus, setPaymentStatus] = useState({
    isProcessing: false,
    error: null,
    success: null,
    step: "ready", // 'ready', 'sending', 'complete'
  });

  // Reset state when modal opens or property changes
  useEffect(() => {
    if (isOpen && property) {
      setPaymentStatus({
        isProcessing: false,
        error: null,
        success: null,
        step: "ready",
      });
    }
  }, [isOpen, property]);

  // Prepare payment contract write operation
  const { config: paymentConfig } = usePrepareContractWrite({
    address: contractAddresses.Regulator,
    abi: RegulatorABI,
    functionName: "depositPayment",
    args: property ? [property.id] : [],
    value: property ? property.price : parseEther("0"),
    enabled: !!property && paymentStatus.step === "ready",
    onError: (error) => {
      console.error("Error preparing payment:", error);
      setPaymentStatus((prev) => ({
        ...prev,
        error: `Failed to prepare payment transaction: ${error.message}`,
      }));
    },
  });

  // Execute payment operation
  const {
    write: writePayment,
    data: paymentData,
    isLoading: isPaymentLoading,
    isSuccess: isPaymentSuccess,
    isError: isPaymentError,
    error: paymentError,
  } = useContractWrite({
    ...paymentConfig,
    onSuccess: (data) => {
      // Update status on successful transaction submission
      setPaymentStatus((prev) => ({
        ...prev,
        step: "sending",
        isProcessing: true,
      }));

      // Log the transaction
      logTransaction({
        user: address,
        userRole: userRole,
        address: contractAddresses.Regulator,
        description: `Payment sent for property #${property.id} (${formatEther(
          property.price
        )}Mn AED)`,
        hash: data.hash,
      });
    },
    onError: (error) => {
      setPaymentStatus((prev) => ({
        ...prev,
        isProcessing: false,
        error: `Payment failed: ${error.message}`,
      }));
    },
  });

  // Wait for payment transaction
  const { isLoading: isPaymentWaiting, isSuccess: isPaymentConfirmed } =
    useWaitForTransaction({
      hash: paymentData?.hash,
      enabled: !!paymentData?.hash,
      onSuccess: () => {
        setPaymentStatus((prev) => ({
          ...prev,
          step: "complete",
          isProcessing: false,
          success:
            "Payment confirmed! The property has been transferred to your wallet.",
        }));

        // Notify parent component of successful payment
        setTimeout(() => {
          onPaymentSuccess();
          onClose();
        }, 3000);
      },
      onError: (error) => {
        console.error("Error with payment transaction:", error);
        setPaymentStatus((prev) => ({
          ...prev,
          isProcessing: false,
          error: `Payment transaction failed: ${error.message}`,
          step: "ready", // Go back to ready state so they can try payment again
        }));
      },
    });

  // Handle payment action
  const handlePayment = () => {
    if (paymentStatus.isProcessing) return; // Prevent actions during processing

    if (writePayment) {
      writePayment();
    } else {
      setPaymentStatus((prev) => ({
        ...prev,
        error: "Payment function not available. Please try again.",
      }));
    }
  };

  // Get button text based on current step
  const getButtonText = () => {
    if (paymentStatus.isProcessing) {
      return "Processing...";
    }
    if (isPaymentLoading || isPaymentWaiting) {
      return "Sending Payment...";
    }

    if (paymentStatus.step === "ready") {
      return `Send Payment (${
        property ? formatEther(property.price) : "0"
      }Mn AED)`;
    }
    if (paymentStatus.step === "complete") {
      return "Transaction Complete";
    }

    return "Confirm";
  };

  // Check if there's a current operation in progress
  const isProcessing =
    paymentStatus.isProcessing || isPaymentLoading || isPaymentWaiting;

  return (
    <Dialog
      open={isOpen}
      onClose={() => !isProcessing && onClose()}
      title="Complete Purchase"
      preventClose={isProcessing}
      className="max-w-md"
    >
      {property && (
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Property:</span>
            <span className="font-semibold">{property.name}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Price:</span>
            <span className="font-semibold">
              {formatEther(property.price)}Mn AED
            </span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Seller:</span>
            <span className="font-mono text-sm">
              {formatAddress(property.seller)}
            </span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Token ID:</span>
            <span className="font-mono text-sm">{property.id}</span>
          </div>
        </div>
      )}

      {/* Error and success messages */}
      {paymentStatus.error && (
        <div className="mb-4">
          <Alert variant="error" dismissible={false}>
            {paymentStatus.error}
          </Alert>
        </div>
      )}

      {paymentStatus.success && (
        <div className="mb-4">
          <Alert variant="success" dismissible={false}>
            {paymentStatus.success}
          </Alert>
        </div>
      )}

      {/* Step content */}
      <div className="mb-6">
        {paymentStatus.step === "ready" && (
          <div className="text-center mb-4">
            <p className="mb-4 text-sm text-gray-600">
              Complete the payment to purchase this property. The payment will
              be held in escrow until the transaction is finalized.
            </p>
            <button
              onClick={handlePayment}
              disabled={isProcessing || paymentStatus.step === "complete"}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center justify-center"
            >
              {isProcessing && (
                <Loader size="md" className="-ml-1 mr-2 text-white" />
              )}
              {getButtonText()}
            </button>
          </div>
        )}

        {paymentStatus.step === "complete" && (
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">Payment Complete!</h3>
            <p className="text-sm text-gray-600">
              The property has been successfully transferred to your wallet.
            </p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex justify-end">
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {paymentStatus.step === "complete" ? "Close" : "Cancel"}
        </button>
      </div>
    </Dialog>
  );
}
