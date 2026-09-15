import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalErrorHandlerService } from './global-error-handler.service';
import { LoggerService } from './logger.service';

describe('GlobalErrorHandlerService', () => {
  const critical = vi.fn();
  let originalBody: string;

  beforeEach(() => {
    TestBed.resetTestingModule();
    critical.mockReset();
    originalBody = document.body.innerHTML;
    TestBed.configureTestingModule({
      providers: [
        GlobalErrorHandlerService,
        { provide: LoggerService, useValue: { critical } },
      ],
    });
  });

  afterEach(() => {
    document.body.innerHTML = originalBody;
    TestBed.resetTestingModule();
  });

  it('reports an unexpected application failure as critical while showing the recovery screen', () => {
    const error = new Error('Unhandled render failure');
    TestBed.inject(GlobalErrorHandlerService).handleError(error);

    expect(critical).toHaveBeenCalledExactlyOnceWith('Unhandled application error', error);
    expect(document.body.textContent).toContain('Ups, algo ha ido mal.');
  });
});
