/**
 * Server initialization file
 * This runs once when the Next.js server starts
 */

import { startAutoSync } from "@/app/utils/sheets-sync-service";

// Auto-start the sync service when server starts
if (process.env.NODE_ENV === "development" || process.env.AUTO_SYNC_ENABLED === "true") {
  console.log("[Server] Initializing auto-sync service...");
  
  // Small delay to ensure MongoDB connection is ready
  setTimeout(() => {
    startAutoSync();
  }, 2000);
}

export {};
