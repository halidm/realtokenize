import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Path to wallets.json file in the data directory
    const walletsPath = path.join(
      process.cwd(),
      "data/wallets",
      "wallets.json"
    );

    if (!fs.existsSync(walletsPath)) {
      return NextResponse.json(
        {
          error:
            "Wallet file not found. Please run npm run create-wallets first.",
        },
        { status: 404 }
      );
    }

    const walletsData = fs.readFileSync(walletsPath, "utf8");
    const wallets = JSON.parse(walletsData);

    // Return the wallets data
    return NextResponse.json(wallets);
  } catch (error) {
    console.error("Error loading wallets:", error);
    return NextResponse.json(
      { error: "Failed to load wallet data" },
      { status: 500 }
    );
  }
}
