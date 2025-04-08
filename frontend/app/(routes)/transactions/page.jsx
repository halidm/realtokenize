"use client";

import { useState, useEffect, useCallback } from "react";
import { useTransactions } from "@/context/TransactionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

export default function TransactionsPage() {
  const { getTransactions } = useTransactions();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Create a memoized fetchTransactions function
  const fetchTransactions = useCallback(async () => {
    try {
      const data = await getTransactions();
      // Sort transactions by timestamp (newest first)
      const sortedTransactions = [...data].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );
      setTransactions(sortedTransactions);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError("Failed to load transactions");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [getTransactions]);

  // Initial fetch
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Set up polling every 5 seconds
  useEffect(() => {
    const pollingInterval = setInterval(() => {
      fetchTransactions();
    }, 5000);

    // Clean up interval on unmount
    return () => clearInterval(pollingInterval);
  }, [fetchTransactions]);

  // Format timestamp to relative time (e.g., "2 hours ago")
  const formatTimeAgo = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return "Invalid date";
    }
  };

  // Truncate long strings (like addresses or hashes)
  const truncate = (str, length = 8) => {
    if (!str) return "";
    if (str.length <= length * 2) return str;
    return `${str.substring(0, length)}...${str.substring(
      str.length - length
    )}`;
  };

  // Get role color - same function as in WalletDropdown
  const getRoleColor = (role) => {
    switch (role) {
      case "admin":
        return "bg-purple-600";
      case "regulator":
        return "bg-blue-600";
      case "user1":
        return "bg-green-600";
      case "user2":
        return "bg-yellow-600";
      default:
        return "bg-gray-600";
    }
  };

  // Get role label text - same function as in WalletDropdown
  const getRoleLabel = (role) => {
    switch (role) {
      case "admin":
        return "Administrator";
      case "regulator":
        return "Regulator";
      case "user1":
        return "User 1";
      case "user2":
        return "User 2";
      default:
        return role;
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">Transaction History</CardTitle>
          {lastUpdated && (
            <div className="text-sm text-muted-foreground">
              Last updated: {formatTimeAgo(lastUpdated)}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading && transactions.length === 0 ? (
            <p className="text-center py-4">Loading transactions...</p>
          ) : error ? (
            <p className="text-center text-red-500 py-4">{error}</p>
          ) : transactions.length === 0 ? (
            <p className="text-center py-4">No transactions found</p>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex flex-row space-x-4 px-4 py-2 bg-gray-100 rounded-lg font-medium">
                <div className="w-[200px]">User</div>
                <div className="w-[140px]">Role</div>
                <div className="w-[200px]">Address</div>
                <div className="w-[400px]">Description</div>
                {/* <div>Transaction Hash</div> */}
                <div className="w-[200px]">Time</div>
              </div>

              {/* Transaction rows */}
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex flex-row space-x-4 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center w-[200px]">
                      <span>{truncate(tx.user)}</span>
                    </div>
                    <div className="flex items-center w-[140px]">
                      <div
                        className={`h-3 w-3 rounded-full mr-2 ${getRoleColor(
                          tx.userRole
                        )}`}
                      ></div>
                      <span>
                        {tx.userRole ? getRoleLabel(tx.userRole) : "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center text-sm truncate w-[200px]">
                      {truncate(tx.address)}
                    </div>
                    <div className="flex items-center text-sm w-[400px]">
                      {tx.description}
                    </div>
                    {/* <div className="text-sm truncate">
                      {tx.hash ? truncate(tx.hash) : "N/A"}
                    </div> */}
                    <div className="flex items-center text-gray-500 text-sm w-[200px]">
                      {formatTimeAgo(tx.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
