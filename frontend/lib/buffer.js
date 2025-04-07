"use client";

// Buffer polyfill for browser environments
if (typeof window !== "undefined" && typeof window.Buffer === "undefined") {
  // Import the buffer package
  const BufferModule = require("buffer");

  // Make Buffer available globally
  window.Buffer = BufferModule.Buffer;
}
