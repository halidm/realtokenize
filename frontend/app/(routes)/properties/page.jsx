"use client";

import NFTGallery from "@/components/features/NFTGallery";

export default function NFTsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Real Estate NFTs</h1>
      <NFTGallery />
    </div>
  );
}
