"use client";

import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-gray-800",
        primary: "bg-green-100 text-green-800",
        secondary: "bg-blue-100 text-blue-800",
        destructive: "bg-red-100 text-red-800",
        outline: "text-gray-600 border border-gray-200",
        success: "bg-green-600 text-white",
        warning: "bg-yellow-600 text-white",
        info: "bg-blue-600 text-white",
        pending: "bg-yellow-100 text-yellow-800",
        completed: "bg-blue-600 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

// Helper function to get the right badge for property status
export function getPropertyStatusBadge(property) {
  if (!property) return null;

  if (property.nftDeposited && property.paymentReceived) {
    return <Badge variant="completed">Sale Complete</Badge>;
  } else if (property.nftDeposited) {
    return <Badge variant="success">Ready for Payment</Badge>;
  } else {
    return <Badge variant="warning">Awaiting NFT Deposit</Badge>;
  }
} 