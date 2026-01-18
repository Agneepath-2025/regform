/**
 * Next.js Instrumentation Hook
 * This file is automatically loaded by Next.js when the server starts
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Server started');
    console.log('[Instrumentation] Using event-driven Google Sheets sync (no polling)');
    console.log('[Instrumentation] Data will sync automatically when inserted/updated in MongoDB');
    
    // Run initial sync if configured (only on first deployment)
    if (process.env.RUN_INITIAL_SYNC_ON_STARTUP === 'true' && process.env.SHEETS_SYNC_ENABLED !== 'false') {
      console.log('[Instrumentation] Running initial Google Sheets sync...');
      
      // Import and run sync after a short delay to ensure DB is ready
      setTimeout(async () => {
        try {
          const { initialFullSync } = await import('./app/utils/sheets-event-sync');
          const result = await initialFullSync();
          
          if (result.success) {
            console.log('[Instrumentation] ✅ Initial sync completed:', result.counts);
            console.log('[Instrumentation] 💡 Set RUN_INITIAL_SYNC_ON_STARTUP=false to disable on next restart');
          } else {
            console.error('[Instrumentation] ❌ Initial sync failed:', result.error);
          }
        } catch (error) {
          console.error('[Instrumentation] ❌ Initial sync error:', error);
        }
      }, 3000); // Wait 3 seconds for server to be ready
    }
    
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;




