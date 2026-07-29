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

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: ErrorHandler, useClass: GlobalErrorHandlerService },
    provideAppInitializer(() => {
      const session = inject(SessionService);
      const logger = inject(LoggerService);
      // Fail open: a guest must never be blocked from using the app because
      // the anonymous auth session couldn't be established (e.g. offline, or
      // Anonymous sign-ins not yet enabled in the Supabase dashboard).
      return session.ensureAuthSession().catch((error) => {
        logger.error('Failed to establish anonymous auth session:', error);
      });
    }),
  ]
};
