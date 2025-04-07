"use client";

import Image from "next/image";
import { formatEther } from "viem";
import { formatAddress } from "@/lib/utils";
import { useUser } from "@/context/UserContext";

export function PropertyCard({ property, onPaymentClick }) {
  const { isRegulator, address } = useUser();
  
  const getStatusText = () => {
    if (property.nftDeposited && property.paymentReceived) {
      return "Sale Complete";
    } else if (property.nftDeposited) {
      return "Awaiting Payment";
    } else {
      return "Awaiting NFT Deposit";
    }
  };
  
  const getStatusBadge = () => {
    if (property.nftDeposited && !property.paymentReceived) {
      return (
        <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
          Ready for Payment
        </span>
      );
    } else if (!property.nftDeposited) {
      return (
        <span className="bg-yellow-600 text-white text-xs px-2 py-1 rounded-full">
          Awaiting NFT Deposit
        </span>
      );
    } else {
      return (
        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
          Payment Received
        </span>
      );
    }
  };
  
  const canPay = () => {
    return (
      !isRegulator && 
      property.nftDeposited && 
      !property.paymentReceived &&
      property.buyer.toLowerCase() === address?.toLowerCase()
    );
  };

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="h-48 bg-gray-200 relative">
        <Image
          src={property.image}
          alt={property.name}
          fill
          className="object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "/images/placeholder-property.jpg";
          }}
        />
        <div className="absolute top-2 right-2">
          {getStatusBadge()}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2">
          {property.name}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {property.description}
        </p>
        <div className="space-y-1 text-sm mb-4">
          <p>
            <span className="font-medium">Price:</span>{" "}
            {formatEther(property.price)} ETH
          </p>
          <p>
            <span className="font-medium">Seller:</span>{" "}
            <span className="font-mono">
              {formatAddress(property.seller)}
            </span>
          </p>
          {isRegulator && (
            <p>
              <span className="font-medium">Buyer:</span>{" "}
              <span className="font-mono">
                {formatAddress(property.buyer)}
              </span>
            </p>
          )}
          <p>
            <span className="font-medium">Status:</span>{" "}
            {getStatusText()}
          </p>
        </div>

        {canPay() && (
          <div className="mt-4">
            <button
              onClick={() => onPaymentClick(property)}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400"
            >
              Pay Now: {formatEther(property.price)} ETH
            </button>
            <div className="mt-2 text-xs text-gray-500">
              Click to send payment and complete the purchase
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 