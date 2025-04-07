"use client";

import { createContext, useState, useContext, useEffect } from "react";
import { useAccount } from "wagmi";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const { address, isConnected } = useAccount();
  const [userRole, setUserRole] = useState(null);
  const [isRegulator, setIsRegulator] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [walletData, setWalletData] = useState(null);

  // Load user data from localStorage when connected
  useEffect(() => {
    if (isConnected) {
      const savedWallet = localStorage.getItem("selectedWallet");
      if (savedWallet) {
        try {
          const parsed = JSON.parse(savedWallet);
          setWalletData(parsed);
          setUserRole(parsed.role);
          setIsRegulator(parsed.role === "regulator");
          setIsAdmin(parsed.role === "admin");
        } catch (error) {
          console.error("Error parsing saved wallet:", error);
          clearUserData();
        }
      }
    } else {
      clearUserData();
    }
  }, [isConnected, address]);

  // Clear user data
  const clearUserData = () => {
    setUserRole(null);
    setIsRegulator(false);
    setIsAdmin(false);
    setWalletData(null);
  };

  // Save wallet data to localStorage
  const saveWalletData = (data) => {
    try {
      localStorage.setItem("selectedWallet", JSON.stringify(data));
      setWalletData(data);
      setUserRole(data.role);
      setIsRegulator(data.role === "regulator");
      setIsAdmin(data.role === "admin");
    } catch (error) {
      console.error("Error saving wallet data:", error);
    }
  };

  // Get the stored wallet data
  const getWalletData = () => {
    try {
      const savedWallet = localStorage.getItem("selectedWallet");
      if (savedWallet) {
        return JSON.parse(savedWallet);
      }
    } catch (error) {
      console.error("Error getting wallet data:", error);
    }
    return null;
  };

  // Remove wallet data from localStorage
  const removeWalletData = () => {
    localStorage.removeItem("selectedWallet");
    clearUserData();
  };

  return (
    <UserContext.Provider
      value={{
        address,
        isConnected,
        userRole,
        isRegulator,
        isAdmin,
        walletData,
        saveWalletData,
        getWalletData,
        removeWalletData
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === null) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
} 