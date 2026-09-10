import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { EventService } from './event.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PendingUpload } from '@core/models/pending-upload';
import { LoggerService } from './logger.service';
import { PendingUploadStore, PENDING_UPLOAD_STORE } from './pending-upload-store.service';
import { PhotoLimitService } from './photo-limit.service';
import { SessionService } from './session.service';
import { SupabaseService } from './supabase.service';
import { isDuplicateStorageError, UploadQueueService } from './upload-queue.service';

class MemoryPendingUploadStore implements PendingUploadStore {
  readonly items = new Map<string, PendingUpload>();

  async get(id: string): Promise<PendingUpload | undefined> {
    const item = this.items.get(id);
    return item ? { ...item } : undefined;
  }

  async getForEvent(eventKey: string): Promise<PendingUpload[]> {
    return [...this.items.values()]
      .filter((item) => item.eventKey === eventKey)
      .sort((left, right) => left.createdAt - right.createdAt)
      .map((item) => ({ ...item }));
  }

  async put(item: PendingUpload): Promise<void> {
    this.items.set(item.id, { ...item });
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}

describe('UploadQueueService', () => {
  const eventKey = 'javier-paula-2026';
  const deviceId = 'device-123';
  let store: MemoryPendingUploadStore;
  let supabase: {
    uploadPhotoWithRetry: ReturnType<typeof vi.fn>;
    savePhotoDataWithRetry: ReturnType<typeof vi.fn>;
  };
  let session: {
    ensureAuthSession: ReturnType<typeof vi.fn>;
    getStoredEventKey: ReturnType<typeof vi.fn>;
    getDeviceId: ReturnType<typeof vi.fn>;
  };
  let photoLimit: { decrementCount: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    TestBed.resetTestingModule();
    store = new MemoryPendingUploadStore();
    supabase = {
      uploadPhotoWithRetry: vi.fn().mockResolvedValue({ error: null }),
      savePhotoDataWithRetry: vi.fn().mockResolvedValue({ error: null }),
    };
    session = {
      ensureAuthSession: vi.fn().mockResolvedValue(undefined),
      getStoredEventKey: vi.fn().mockReturnValue(eventKey),
      getDeviceId: vi.fn().mockReturnValue(deviceId),
    };
    photoLimit = { decrementCount: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: EventService, useValue: { canUpload: signal(true), refresh: vi.fn().mockResolvedValue(undefined) } },
        UploadQueueService,
        { provide: PENDING_UPLOAD_STORE, useValue: store },
        { provide: SupabaseService, useValue: supabase },
        { provide: SessionService, useValue: session },
        { provide: PhotoLimitService, useValue: photoLimit },
        { provide: LoggerService, useValue: { warn: vi.fn(), error: vi.fn(), debug: vi.fn() } },
      ],
    });
  });

  it('persists an offline photo without calling Supabase', async () => {
    setOnline(false);
    const service = TestBed.inject(UploadQueueService);

    const result = await service.enqueueAndUpload(new Blob(['photo'], { type: 'image/jpeg' }), 'Hola');

    expect(result).toBe('queued');
    expect(store.items.size).toBe(1);
    expect(service.pendingCount()).toBe(1);
    expect(photoLimit.decrementCount).toHaveBeenCalledOnce();
    expect(supabase.uploadPhotoWithRetry).not.toHaveBeenCalled();
  });

  it('rejects new photos while the event is waiting', async () => {
    const event = TestBed.inject(EventService);
    (event.canUpload as ReturnType<typeof signal<boolean>>).set(false);
    const service = TestBed.inject(UploadQueueService);
    await expect(service.enqueueAndUpload(new Blob(['photo']), '')).rejects.toThrow('álbum');
    expect(store.items.size).toBe(0);
    expect(supabase.uploadPhotoWithRetry).not.toHaveBeenCalled();
  });

  it('keeps queued photos until an event reopens', async () => {
    setOnline(false);
    const service = TestBed.inject(UploadQueueService);
    await service.enqueueAndUpload(new Blob(['photo'], {type:'image/jpeg'}), '');
    const event = TestBed.inject(EventService);
    (event.canUpload as ReturnType<typeof signal<boolean>>).set(false);
    setOnline(true);
    await service.processPending();
    expect(store.items.size).toBe(1);
    expect(supabase.uploadPhotoWithRetry).not.toHaveBeenCalled();
    (event.canUpload as ReturnType<typeof signal<boolean>>).set(true);
    await service.processPending();
    expect(store.items.size).toBe(0);
    expect(supabase.uploadPhotoWithRetry).toHaveBeenCalledOnce();
  });

  it('keeps an offline photo safe when the count refresh fails after persistence', async () => {
    setOnline(false);
    const service = TestBed.inject(UploadQueueService);
    await service.initialize();
    vi.spyOn(store, 'getForEvent').mockRejectedValueOnce(new Error('transient IndexedDB read failure'));

    const result = await service.enqueueAndUpload(new Blob(['photo'], { type: 'image/jpeg' }), 'Hola');

    expect(result).toBe('queued');
    expect(store.items.size).toBe(1);
    expect(photoLimit.decrementCount).toHaveBeenCalledOnce();
    expect(supabase.uploadPhotoWithRetry).not.toHaveBeenCalled();
  });

  it('publishes and removes a queued photo when online', async () => {
    setOnline(true);
    const service = TestBed.inject(UploadQueueService);

    const result = await service.enqueueAndUpload(new Blob(['photo'], { type: 'image/jpeg' }), 'Hola');

    expect(result).toBe('published');
    expect(store.items.size).toBe(0);
    expect(photoLimit.decrementCount).toHaveBeenCalledOnce();
    expect(supabase.uploadPhotoWithRetry).toHaveBeenCalledOnce();
    expect(supabase.savePhotoDataWithRetry).toHaveBeenCalledOnce();
  });

  it('resumes at metadata when Storage was already completed', async () => {
    setOnline(true);
    const item = pendingItem({ stage: 'storage-uploaded' });
    await store.put(item);
    const service = TestBed.inject(UploadQueueService);

    await service.processPending();

    expect(supabase.uploadPhotoWithRetry).not.toHaveBeenCalled();
    expect(supabase.savePhotoDataWithRetry).toHaveBeenCalledOnce();
    expect(store.items.size).toBe(0);
    expect(photoLimit.decrementCount).not.toHaveBeenCalled();
  });

  it('retains the storage-complete stage when metadata fails', async () => {
    setOnline(true);
    supabase.savePhotoDataWithRetry.mockRejectedValue(new Error('network unavailable'));
    const service = TestBed.inject(UploadQueueService);

    const result = await service.enqueueAndUpload(new Blob(['photo']), '');
    const [remaining] = [...store.items.values()];

    expect(result).toBe('queued');
    expect(remaining.stage).toBe('storage-uploaded');
    expect(remaining.attempts).toBe(1);
    expect(remaining.lastError).toBe('network unavailable');
  });

  it('flushes a photo added while another queue pass is in progress', async () => {
    setOnline(true);
    await store.put(pendingItem());
    let releaseFirstUpload!: () => void;
    const firstUpload = new Promise<void>((resolve) => {
      releaseFirstUpload = resolve;
    });
    supabase.uploadPhotoWithRetry.mockImplementationOnce(async () => {
      await firstUpload;
      return { error: null };
    });
    const service = TestBed.inject(UploadQueueService);

    const existingFlush = service.processPending();
    await vi.waitFor(() => expect(supabase.uploadPhotoWithRetry).toHaveBeenCalledOnce());
    const newCapture = service.enqueueAndUpload(new Blob(['second-photo']), 'Segunda');
    releaseFirstUpload();

    await Promise.all([existingFlush, newCapture]);
    expect(supabase.uploadPhotoWithRetry).toHaveBeenCalledTimes(2);
    expect(store.items.size).toBe(0);
  });

  function pendingItem(overrides: Partial<PendingUpload> = {}): PendingUpload {
    return {
      id: 'upload-1',
      eventKey,
      deviceId,
      storagePath: `uploads/${eventKey}/${deviceId}/upload-1.jpg`,
      dedication: '',
      image: new Blob(['photo'], { type: 'image/jpeg' }),
      createdAt: 1,
      stage: 'queued',
      attempts: 0,
      ...overrides,
    };
  }
});

describe('isDuplicateStorageError', () => {
  it('recognises Supabase duplicate responses', () => {
    expect(isDuplicateStorageError({ statusCode: '409', message: 'Duplicate' })).toBe(true);
    expect(isDuplicateStorageError({ message: 'The resource already exists' })).toBe(true);
  });

  it('does not swallow unrelated upload failures', () => {
    expect(isDuplicateStorageError({ status: 503, message: 'Unavailable' })).toBe(false);
    expect(isDuplicateStorageError(new Error('Network error'))).toBe(false);
  });
});

function setOnline(value: boolean): void {
  Object.defineProperty(navigator, 'onLine', {
    value,
    configurable: true,
  });
}
