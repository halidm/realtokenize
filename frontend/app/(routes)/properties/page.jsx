"use client";

import { useState } from "react";
import NFTGallery from "@/components/features/NFTGallery";
import { Card } from "@/components/ui/Card";

export default function NFTsPage() {
  const [transactions, setTransactions] = useState([]);

  const addTransaction = (transaction) => {
    setTransactions((prev) => [transaction, ...prev]);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Real Estate NFTs</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main gallery section */}
        <div className="flex-1">
          <NFTGallery addTransaction={addTransaction} />
        </div>

        {/* Transaction history section */}
        <div className="w-full lg:w-80">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
            {transactions.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent transactions</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx, index) => (
                  <div key={index} className="border-b pb-2">
                    <p className="text-sm font-medium">{tx.description}</p>
                    {tx.hash && (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline truncate block"
                      >
                        {tx.hash.substring(0, 8)}...{tx.hash.substring(tx.hash.length - 6)}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
} 