"use client";

import { createContext, useContext } from "react";

const TransactionContext = createContext();

export function TransactionProvider({ children }) {
  // Function to log a transaction
  const logTransaction = async (transactionData) => {
    try {
      const { user, userRole, address, description, hash } = transactionData;

      // Make sure required fields are present
      if (!user || !address || !description) {
        console.error("Missing required transaction fields");
        return false;
      }

      // Send transaction to API endpoint
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user,
          userRole,
          address,
          description,
          hash,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to log transaction");
      }

      return await response.json();
    } catch (error) {
      console.error("Error logging transaction:", error);
      return false;
    }
  };

  // Function to get all transactions
  const getTransactions = async () => {
    try {
      const response = await fetch("/api/transactions");

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return [];
    }
  };

  return (
    <TransactionContext.Provider value={{ logTransaction, getTransactions }}>
      {children}
    </TransactionContext.Provider>
  );
}

// Custom hook to use the transaction context
export function useTransactions() {
  const context = useContext(TransactionContext);

  if (context === undefined) {
    throw new Error(
      "useTransactions must be used within a TransactionProvider"
    );
  }

  return context;
}
