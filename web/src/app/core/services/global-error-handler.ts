import { ErrorHandler, inject, Injectable } from '@angular/core';
import { LoggerService } from './logger.service';

@Injectable()
export class GlobalErrorHandlerService implements ErrorHandler {
  private readonly logger = inject(LoggerService);

  handleError(error: any): void {
    this.logger.error('Lumen Global Error Caught:', error);

    // Manipulate DOM to prevent blank white screen
    document.body.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; width: 100vw; background-color: #f7f7f7; color: #333; font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 24px; box-sizing: border-box;">
        <svg style="width: 64px; height: 64px; margin-bottom: 24px; color: #ff6b6b;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        <h1 style="font-size: 24px; margin-bottom: 12px; font-weight: bold;">Ups, algo ha ido mal.</h1>
        <p style="font-size: 16px; margin-bottom: 24px; line-height: 1.5; color: #666;">
          Parece que tu navegador necesita actualizarse o hubo un error inesperado.<br><br>
          Por favor, <strong>abre este enlace en Safari o Chrome</strong>, o actualiza tu móvil.
        </p>
      </div>
  `;
  }
}
