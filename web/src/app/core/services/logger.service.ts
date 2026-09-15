import { Injectable, isDevMode } from '@angular/core';
import { DiagnosticLogger } from '../logging/diagnostic-logger';

let applicationLogger: DiagnosticLogger | undefined;

// Shared with main.ts so even a failed Angular bootstrap can be reported.
export function getApplicationLogger(): DiagnosticLogger {
  return applicationLogger ??= new DiagnosticLogger({ production: !isDevMode() });
}

/** Five-level facade; production sends warn+ to the server, critical to Telegram. */
@Injectable({ providedIn: 'root' })
export class LoggerService {
  private readonly logger = getApplicationLogger();
  debug(message: string, ...details: unknown[]): void { this.logger.debug(message, ...details); }
  info(message: string, ...details: unknown[]): void { this.logger.info(message, ...details); }
  warn(message: string, ...details: unknown[]): void { this.logger.warn(message, ...details); }
  error(message: string, ...details: unknown[]): void { this.logger.error(message, ...details); }
  critical(message: string, ...details: unknown[]): void { this.logger.critical(message, ...details); }
  getRecentEntries() { return this.logger.getRecentEntries(); }
}
