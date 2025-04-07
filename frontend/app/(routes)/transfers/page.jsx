"use client";

import { useState } from "react";
import { useUser } from "@/context/UserContext";
import PendingTransfers from "@/components/features/PendingTransfers";
import { Alert } from "@/components/ui/Alert";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function RegulatorPage() {
  const { isConnected, isRegulator } = useUser();
  const [activeTab, setActiveTab] = useState("transfers"); // "transfers" or "vault"

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Regulator Dashboard</h1>

        <Alert variant="warning" className="mb-6">
          Please connect your wallet to access the regulator dashboard.
        </Alert>
      </div>
    );
  }

  if (!isRegulator) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Regulator Dashboard</h1>

        <Alert variant="error" className="mb-6">
          You do not have regulator privileges. Only regulators can access this
          dashboard.
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Regulator Dashboard</h1>

        <div className="flex gap-2">
          <Link href="/vault">
            <Button variant="secondary">View Vault</Button>
          </Link>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Regulatory Functions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            As a regulator, you have the authority to approve or reject property
            transfers and vault deposits. This ensures regulatory compliance and
            maintains the integrity of the tokenized real estate platform.
          </p>

          <div className="flex border-b border-gray-200 mb-6">
            <button
              className={`px-4 py-2 border-b-2 font-medium text-sm ${
                activeTab === "transfers"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveTab("transfers")}
            >
              Pending Transfers
            </button>
            <button
              className={`px-4 py-2 border-b-2 font-medium text-sm ${
                activeTab === "vault"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveTab("vault")}
            >
              Vault Deposits
            </button>
          </div>
          {activeTab === "transfers" && <PendingTransfers filter="all" />}
          {activeTab === "vault" && <PendingTransfers filter="vault" />}
        </CardContent>
      </Card>
    </div>
  );
}
