import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

// Path to transactions.json file
const transactionsPath = path.join(
  process.cwd(),
  "data/transactions",
  "transactions.json"
);

// Helper function to get existing transactions
const getTransactions = () => {
  if (!fs.existsSync(transactionsPath)) {
    // If file doesn't exist, create it with empty array
    fs.writeFileSync(transactionsPath, JSON.stringify([], null, 2));
    return [];
  }

  const data = fs.readFileSync(transactionsPath, "utf8");
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error("Error parsing transactions:", error);
    return [];
  }
};

// GET endpoint to retrieve all transactions
export async function GET() {
  try {
    const transactions = getTransactions();
    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Error loading transactions:", error);
    return NextResponse.json(
      { error: "Failed to load transaction data" },
      { status: 500 }
    );
  }
}

// POST endpoint to add a new transaction
export async function POST(request) {
  try {
    const body = await request.json();
    const { user, userRole, address, description, hash, timestamp } = body;

    // Validate required fields
    if (!user || !address || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get current transactions
    const transactions = getTransactions();

    // Add new transaction with timestamp
    const newTransaction = {
      id:
        transactions.length > 0
          ? Math.max(...transactions.map((t) => t.id)) + 1
          : 1,
      user,
      userRole,
      address,
      description,
      hash,
      timestamp: timestamp || new Date().toISOString(),
    };

    transactions.push(newTransaction);

    // Write updated transactions back to file
    fs.writeFileSync(transactionsPath, JSON.stringify(transactions, null, 2));

    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error) {
    console.error("Error saving transaction:", error);
    return NextResponse.json(
      { error: "Failed to save transaction" },
      { status: 500 }
    );
  }
}
