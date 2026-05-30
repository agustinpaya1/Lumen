import { Injectable } from '@angular/core';
import { environment } from '@environments/environment';

/**
 * Thin logging facade. Stays silent in production builds (no console noise for
 * guests) and forwards to the console in development. Centralising logging here
 * means the sink can later be swapped for remote error reporting without
 * touching call sites.
 */
@Injectable({ providedIn: 'root' })
export class LoggerService {
  error(message: string, ...details: unknown[]): void {
    if (!environment.production) {
      console.error(message, ...details);
    }
  }

  warn(message: string, ...details: unknown[]): void {
    if (!environment.production) {
      console.warn(message, ...details);
    }
  }

  debug(message: string, ...details: unknown[]): void {
    if (!environment.production) {
      console.debug(message, ...details);
    }
  }
}
