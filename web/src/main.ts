import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app';
import { getApplicationLogger } from './app/core/services/logger.service';

const logger = getApplicationLogger();
logger.info('Application bootstrap started');

bootstrapApplication(AppComponent, appConfig)
  .then(() => logger.info('Application bootstrap completed'))
  .catch((error: unknown) => logger.critical('Application bootstrap failed', error));
