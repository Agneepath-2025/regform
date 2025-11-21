/**
 * Next.js Instrumentation Hook
 * This file is automatically loaded by Next.js when the server starts
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamic import to avoid bundling issues
    const { startAutoSync } = await import('./app/utils/sheets-sync-service');
    
    console.log('[Instrumentation] Server started, initializing auto-sync...');
    
    // Wait a bit for MongoDB connection to be ready
    setTimeout(() => {
      if (process.env.AUTO_SYNC_ENABLED === 'true' || process.env.NODE_ENV === 'development') {
        startAutoSync();
      } else {
        console.log('[Instrumentation] Auto-sync disabled. Set AUTO_SYNC_ENABLED=true to enable.');
      }
    }, 3000);
  }
}
