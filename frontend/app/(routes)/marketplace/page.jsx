"use client";

import { useState, useEffect } from "react";
import { useContractRead } from "wagmi";
import { PaymentModal } from "@/components/features/PaymentModal";
import { PropertyCard } from "@/components/features/PropertyCard";
import { useUser } from "@/context/UserContext";
import { fetchNFTMetadata } from "@/lib/nftUtils";
import { Loader } from "@/components/ui/Loader";
import RegulatorABI from "@/contracts/Regulator.json";
import contractAddresses from "@/contracts/addresses.json";
import { formatAddress } from "@/lib/utils";

export default function MarketplacePage() {
  const { address, isConnected, isRegulator } = useUser();
  const [transactions, setTransactions] = useState([]);
  const [listedProperties, setListedProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Add transaction tracking function
  const addTransaction = (transaction) => {
    setTransactions((prev) => [transaction, ...prev]);
  };

  // Use different read function based on user role
  const { data: propertiesData, refetch: refetchProperties } = useContractRead({
    address: contractAddresses.Regulator,
    abi: RegulatorABI,
    functionName: isRegulator
      ? "getAllListedProperties"
      : "getPropertiesListedToBuyer",
    args: isRegulator ? [] : [address],
    enabled: isConnected && !!address,
    watch: true,
  });

  // Process the properties data
  useEffect(() => {
    const fetchPropertyDetails = async () => {
      if (!propertiesData || propertiesData.length === 0) {
        setListedProperties([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const detailedProperties = await Promise.all(
          propertiesData.map(async (property) => {
            const tokenId = property.tokenId.toString();
            // Use the utility function to fetch NFT metadata
            let metadata = await fetchNFTMetadata(tokenId);

            return {
              tokenId,
              seller: property.seller,
              buyer: property.buyer,
              price: property.price,
              nftDeposited: property.nftDeposited,
              paymentReceived: property.paymentReceived,
              ...metadata,
            };
          })
        );

        setListedProperties(detailedProperties);
        setError(null);
      } catch (err) {
        console.error("Error fetching property details:", err);
        setError("Failed to load marketplace listings");
      } finally {
        setLoading(false);
      }
    };

    fetchPropertyDetails();
  }, [propertiesData, address]);

  // Handle payment button click
  const handlePaymentClick = (property) => {
    // Verify this property is listed to the current user
    if (property.buyer.toLowerCase() !== address?.toLowerCase()) {
      setError(
        `This property is listed for buyer ${formatAddress(property.buyer)}, not your address. You can only purchase properties listed for your wallet address.`
      );
      return;
    }

    setSelectedProperty(property);
    setIsPaymentModalOpen(true);
  };
  
  // Handle successful payment
  const handlePaymentSuccess = () => {
    // Refresh the property listings
    refetchProperties();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Marketplace</h1>

      {isConnected ? (
        <>
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-bold mb-6">
              {isRegulator ? "All Listed Properties" : "Properties For You"}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-center py-8 flex flex-col items-center justify-center">
                <Loader size="xl" className="text-blue-500 mb-4" />
                <p className="text-gray-600">Loading listings...</p>
              </div>
            ) : listedProperties.length === 0 ? (
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <p className="text-gray-600">
                  {isRegulator
                    ? "No properties currently listed for sale"
                    : "No properties are currently being sold to you"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listedProperties.map((property) => (
                  <PropertyCard 
                    key={property.tokenId}
                    property={property}
                    onPaymentClick={handlePaymentClick}
                  />
                ))}
              </div>
            )}
          </div>

          {transactions.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">Recent Transactions</h2>
              <div className="space-y-2">
                {transactions.map((tx, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 rounded-md border border-gray-200"
                  >
                    <p className="text-sm text-gray-700">{tx.description}</p>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline"
                    >
                      View transaction
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Modal */}
          <PaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            property={selectedProperty}
            onPaymentSuccess={handlePaymentSuccess}
            addTransaction={addTransaction}
          />
        </>
      ) : (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            Please connect your wallet to view the marketplace
          </p>
        </div>
      )}
    </div>
  );
} 