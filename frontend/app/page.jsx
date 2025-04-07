"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto">        
        <Card className="mb-10">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Welcome to the RealTokenize Demo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-6">
              This demo showcases how blockchain technology can revolutionize real estate ownership
              through tokenization, making property investment more accessible, liquid, and transparent.
            </p>
            
            <Card className="bg-gray-700">
              <CardContent className="p-4">
                <h3 className="text-xl font-medium text-white">Getting Started:</h3>
                <ol className="list-decimal pl-5 space-y-2 text-gray-200">
                  <li>Select a demo wallet from the dropdown in the top-right corner</li>
                  <li>Each wallet represents a different role in the ecosystem:</li>
                  <ul className="list-disc pl-5 space-y-1 my-2">
                    <li><span className="text-purple-400 font-medium">Admin</span> - Platform administrator with full access</li>
                    <li><span className="text-blue-400 font-medium">Regulator</span> - Approves transactions and verifies compliance</li>
                    <li><span className="text-green-400 font-medium">User 1 & User 2</span> - Property buyers and sellers</li>
                  </ul>
                  <li>Navigate through the platform to explore properties, marketplace listings, and transaction history</li>
                  <li>Experience the complete property tokenization lifecycle</li>
                </ol>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button 
            href="/properties"
            variant="primary"
            size="lg"
          >
            View Properties
          </Button>
        </div>
      </div>
    </div>
  );
} 