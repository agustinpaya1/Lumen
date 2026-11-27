import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import imageCompression from 'browser-image-compression';
import { AnalyticsService } from '@core/services/analytics.service';
import { EventService } from '@core/services/event.service';
import { FeedbackService } from '@core/services/feedback.service';
import { LoggerService } from '@core/services/logger.service';
import { PhotoLimitService } from '@core/services/photo-limit.service';
import { UploadQueueService } from '@core/services/upload-queue.service';
import { CameraComponent } from './camera';

vi.mock('browser-image-compression', () => ({ default: vi.fn() }));

describe('Camera operational failures', () => {
  let camera: CameraComponent;
  const canUpload = signal(true);
  const enqueueAndUpload = vi.fn();
  const triggerSuccess = vi.fn();
  const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), critical: vi.fn() };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    vi.resetAllMocks();
    vi.useFakeTimers();
    canUpload.set(true);
    enqueueAndUpload.mockResolvedValue('queued');
    vi.mocked(imageCompression).mockImplementation(async (file) => file);
    TestBed.configureTestingModule({
      imports: [CameraComponent],
      providers: [
        { provide: EventService, useValue: { canUpload, initialize: vi.fn().mockResolvedValue(undefined) } },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: PhotoLimitService, useValue: { photosLeft: signal(10), canTakePhoto: () => true } },
        { provide: UploadQueueService, useValue: { enqueueAndUpload } },
        { provide: FeedbackService, useValue: { triggerSuccess, triggerError: vi.fn() } },
        { provide: LoggerService, useValue: logger },
        { provide: AnalyticsService, useValue: { track: vi.fn() } },
      ],
    }).overrideComponent(CameraComponent, { set: { template: '' } });
    await TestBed.compileComponents();
    camera = TestBed.createComponent(CameraComponent).componentInstance;
    camera.rawPhotoBlob.set(new Blob(['private photo'], { type: 'image/jpeg' }));
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('reports exhausted safe-saving attempts as critical and retains the original for retry', async () => {
    const error = new Error('Local persistence and upload both failed');
    enqueueAndUpload.mockRejectedValue(error);

    await camera.uploadPhoto();

    expect(logger.critical).toHaveBeenCalledExactlyOnceWith(
      'Photo could not be saved safely; original remains in preview',
      error,
    );
    expect(camera.currentState()).toBe('preview');
    expect(camera.rawPhotoBlob()).not.toBeNull();
    expect(camera.isUploading()).toBe(false);
  });

  it('accepts a durable pending photo without raising a critical alert', async () => {
    await camera.uploadPhoto();

    expect(camera.currentState()).toBe('queued');
    expect(logger.critical).not.toHaveBeenCalled();
  });

  it('requires confirmation when the dedication is empty or only whitespace', () => {
    const dialog = document.createElement('dialog');
    dialog.showModal = vi.fn();
    camera.dedicationForm.dedication().value.set('   ');

    camera.requestUpload(dialog, document.createElement('button'));

    expect(dialog.showModal).toHaveBeenCalledOnce();
    expect(imageCompression).not.toHaveBeenCalled();
    expect(enqueueAndUpload).not.toHaveBeenCalled();
  });

  it('uploads a written dedication directly', async () => {
    const dialog = document.createElement('dialog');
    dialog.showModal = vi.fn();
    camera.dedicationForm.dedication().value.set('  Un gran recuerdo  ');

    camera.requestUpload(dialog, document.createElement('button'));
    await vi.advanceTimersByTimeAsync(0);

    expect(dialog.showModal).not.toHaveBeenCalled();
    expect(enqueueAndUpload).toHaveBeenCalledExactlyOnceWith(
      expect.any(File),
      'Un gran recuerdo',
      expect.any(Object),
    );
  });

  it('does not classify a post-save UI failure as an unsafe photo', async () => {
    triggerSuccess.mockImplementation(() => { throw new Error('Feedback unavailable'); });

    await camera.uploadPhoto();

    expect(logger.warn).toHaveBeenCalledWith(
      'Photo submission interrupted',
      { safelySaved: true },
      expect.any(Error),
    );
    expect(logger.critical).not.toHaveBeenCalled();
  });

  it('does not send a critical alert when the event closes during submission', async () => {
    enqueueAndUpload.mockImplementation(async () => {
      canUpload.set(false);
      throw new Error('Album closed');
    });

    await camera.uploadPhoto();

    expect(logger.warn).toHaveBeenCalledOnce();
    expect(logger.critical).not.toHaveBeenCalled();
  });

  it('treats denied camera permission as a recoverable warning', async () => {
    const error = Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' });
    vi.stubGlobal('navigator', {
      userAgent: '',
      mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(error) },
    });

    try {
      await camera.startCamera();
      expect(logger.warn).toHaveBeenCalledWith('Camera access unavailable', error);
      expect(logger.critical).not.toHaveBeenCalled();
      expect(camera.permissionHelperVisible()).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
