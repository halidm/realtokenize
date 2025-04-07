"use client";

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine class names with tailwind merge
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Formats an Ethereum address to a shortened version
 * @param {string} address - The Ethereum address to format
 * @param {number} displayLength - Number of characters to display at start and end (default 4)
 * @returns {string} Formatted address
 */
export function formatAddress(address, displayLength = 4) {
  if (!address) return "";
  if (address.length <= displayLength * 2) return address;
  return `${address.substring(0, displayLength)}...${address.substring(
    address.length - displayLength
  )}`;
}

/**
 * Format a timestamp to a human readable date
 */
export function formatDate(timestamp) {
  if (!timestamp) return "";
  return new Date(Number(timestamp) * 1000).toLocaleString();
}

/**
 * Sleep for a specified amount of time
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text, maxLength) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Parse error messages from various sources
 */
export function parseErrorMessage(error) {
  if (!error) return "An unknown error occurred";

  // Handle string errors
  if (typeof error === "string") return error;

  // Handle ethereum/contract errors
  if (error.reason) return error.reason;
  if (error.message) return error.message;

  // Fallback
  return "An error occurred. Please try again.";
}
