import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { GlobalErrorHandlerService } from '@core/services/global-error-handler.service';
import { LoggerService } from '@core/services/logger.service';
import { SessionService } from '@core/services/session.service';
import { UploadQueueService } from '@core/services/upload-queue.service';
import { EventService } from '@core/services/event.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: ErrorHandler, useClass: GlobalErrorHandlerService },
    provideAppInitializer(() => {
      const session = inject(SessionService);
      const uploadQueue = inject(UploadQueueService);
      const logger = inject(LoggerService);
      const event = inject(EventService);
      // Fail open: a guest must never be blocked from using the app because
      // the anonymous auth session couldn't be established (e.g. offline, or
      // Anonymous sign-ins not yet enabled in the Supabase dashboard).
      return session
        .ensureAuthSession()
        .catch((error) => {
          logger.error('Failed to establish anonymous auth session:', error);
        })
        .then(async () => {
          await event.initialize();
          await uploadQueue.initialize();
          void uploadQueue.processPending();
        })
        .catch((error) => {
          // IndexedDB may be disabled. The queue service preserves direct
          // online uploads, so initialization must not blank the app.
          logger.warn('Failed to initialize the offline upload queue:', error);
        });
    }),
  ]
};
