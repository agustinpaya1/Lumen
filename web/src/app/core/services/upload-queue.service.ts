import { inject, Injectable, signal } from '@angular/core';
import {
  EnqueueResult,
  PendingUpload,
  UploadProgressHooks,
} from '@core/models/pending-upload';
import { LoggerService } from './logger.service';
import { PendingUploadStore, PENDING_UPLOAD_STORE } from './pending-upload-store.service';
import { PhotoLimitService } from './photo-limit.service';
import { SessionService } from './session.service';
import { SupabaseService } from './supabase.service';
import { EventService } from './event.service';

interface FocusedHooks {
  itemId: string;
  hooks: UploadProgressHooks;
}

@Injectable({ providedIn: 'root' })
export class UploadQueueService {
  private readonly store: PendingUploadStore = inject(PENDING_UPLOAD_STORE);
  private readonly supabase = inject(SupabaseService);
  private readonly session = inject(SessionService);
  private readonly photoLimit = inject(PhotoLimitService);
  private readonly logger = inject(LoggerService);
  private readonly event = inject(EventService);

  readonly pendingCount = signal(0);
  readonly failedCount = signal(0);
  readonly isProcessing = signal(false);
  readonly isOnline = signal(this.browserIsOnline());
  readonly persistenceAvailable = signal(true);
  readonly lastPublishedAt = signal<number | null>(null);

  private initialized = false;
  private processingPromise: Promise<void> | null = null;

  private readonly handleOnline = () => {
    this.isOnline.set(true);
    void this.processPending();
  };

  private readonly handleOffline = () => this.isOnline.set(false);

  private readonly handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      this.isOnline.set(this.browserIsOnline());
      if (this.isOnline()) void this.processPending();
    }
  };

  /** Loads queue state and registers the lightweight retry triggers once. */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    document.addEventListener('visibilitychange', this.handleVisibility);

    try {
      await this.refreshCounts();
    } catch (error) {
      this.persistenceAvailable.set(false);
      this.logger.warn('IndexedDB upload queue is unavailable:', error);
    }
  }

  /**
   * Persists first, then attempts publication. Once this method returns
   * `queued`, the component may safely release its in-memory photo blob.
   */
  async enqueueAndUpload(
    image: Blob,
    dedication: string,
    hooks: UploadProgressHooks = {}
  ): Promise<EnqueueResult> {
    await this.initialize();
    if (!this.event.canUpload()) throw new Error('El álbum todavía no admite fotos. Espera a que se abra.');
    const item = this.createItem(image, dedication);
    let persisted = false;

    try {
      await this.store.put(item);
      persisted = true;
      this.persistenceAvailable.set(true);
      this.photoLimit.decrementCount();
    } catch (error) {
      this.persistenceAvailable.set(false);
      this.logger.warn('Could not persist photo in IndexedDB:', error);

      // IndexedDB can be disabled in private/locked-down browsers. Preserve
      // the old online behaviour rather than rejecting an otherwise valid upload.
      if (!this.browserIsOnline()) throw error;
    }

    // Count refresh is informative, not part of the durability transaction.
    // Some Safari versions can complete put() and transiently fail the
    // following indexed read; the already-saved photo must still be accepted.
    if (persisted) await this.refreshCountsSafely();

    if (!this.browserIsOnline()) return 'queued';

    if (!persisted) {
      await this.publishItem(item, false, { itemId: item.id, hooks });
      this.photoLimit.decrementCount();
      return 'published';
    }

    await this.processPendingInternal({ itemId: item.id, hooks });
    return (await this.store.get(item.id)) ? 'queued' : 'published';
  }

  /** Flushes the active event in capture order and coalesces concurrent triggers. */
  async processPending(): Promise<void> {
    await this.processPendingInternal();
  }

  private async processPendingInternal(focusedHooks?: FocusedHooks): Promise<void> {
    await this.initialize();
    this.isOnline.set(this.browserIsOnline());
    if (!this.isOnline()) return;

    if (this.processingPromise) {
      await this.processingPromise;
      // A capture may be persisted while another flush is already reading its
      // initial snapshot. Give that newly-focused item its own pass afterwards.
      if (focusedHooks && (await this.store.get(focusedHooks.itemId))) {
        await this.processPendingInternal(focusedHooks);
      }
      return;
    }

    this.processingPromise = this.flush(focusedHooks).finally(() => {
      this.processingPromise = null;
      this.isProcessing.set(false);
    });

    await this.processingPromise;
  }

  private async flush(focusedHooks?: FocusedHooks): Promise<void> {
    this.isProcessing.set(true);

    try {
      // Bootstrap deliberately fails open. Retrying here lets an offline-started
      // session obtain auth and membership before its queued photos are drained.
      await this.event.refresh();
      if (!this.event.canUpload()) return;
      await this.session.ensureAuthSession();
      const eventKey = this.session.getStoredEventKey();
      const items = await this.store.getForEvent(eventKey);

      for (const item of items) {
        const hooks = focusedHooks?.itemId === item.id ? focusedHooks : undefined;
        try {
          await this.publishItem(item, true, hooks);
        } catch (error) {
          item.attempts += 1;
          item.lastError = this.errorMessage(error);
          await this.store.put(item);
          this.logger.warn('Queued photo remains pending:', error);
          // A connection/auth failure is likely to affect every following item.
          // Stop this pass instead of burning battery retrying the whole queue.
          break;
        }
      }
    } catch (error) {
      this.logger.warn('Upload queue could not be processed:', error);
    } finally {
      await this.refreshCountsSafely();
    }
  }

  private async publishItem(
    item: PendingUpload,
    persisted: boolean,
    focusedHooks?: FocusedHooks
  ): Promise<void> {
    if (item.stage === 'queued') {
      try {
        await this.supabase.uploadPhotoWithRetry(
          new File([item.image], `${item.id}.jpg`, { type: item.image.type || 'image/jpeg' }),
          item.storagePath,
          focusedHooks?.hooks.onStorageRetry
        );
      } catch (error) {
        // A crash can happen after Storage accepts the object but before the
        // stage is persisted. The deterministic UUID path makes this duplicate
        // response safe to interpret as an already-completed Storage step.
        if (!isDuplicateStorageError(error)) throw error;
      }

      item.stage = 'storage-uploaded';
      item.lastError = undefined;
      if (persisted) await this.store.put(item);
      focusedHooks?.hooks.onStorageComplete?.();
    } else {
      focusedHooks?.hooks.onStorageComplete?.();
    }

    await this.supabase.savePhotoDataWithRetry(
      item.storagePath,
      item.dedication,
      item.id,
      item.eventKey,
      item.deviceId,
      item.createdAt,
      focusedHooks?.hooks.onMetadataRetry
    );

    if (persisted) await this.store.delete(item.id);
    this.lastPublishedAt.set(Date.now());
  }

  private createItem(image: Blob, dedication: string): PendingUpload {
    const id = this.generateId();
    const eventKey = this.session.getStoredEventKey();
    const deviceId = this.session.getDeviceId();

    return {
      id,
      eventKey,
      deviceId,
      // Preserve the historical `uploads/` prefix used by the Storage policy,
      // while keeping every retry idempotent through a deterministic UUID path.
      storagePath: `uploads/${eventKey}/${deviceId}/${id}.jpg`,
      dedication,
      // Store a plain Blob rather than a File/subclass with browser-specific
      // properties. This is more consistently structured-cloneable on Safari.
      image: image.slice(0, image.size, image.type || 'image/jpeg'),
      createdAt: Date.now(),
      stage: 'queued',
      attempts: 0,
    };
  }

  private async refreshCounts(): Promise<void> {
    const items = await this.store.getForEvent(this.session.getStoredEventKey());
    this.pendingCount.set(items.length);
    this.failedCount.set(items.filter((item) => Boolean(item.lastError)).length);
  }

  private async refreshCountsSafely(): Promise<void> {
    try {
      await this.refreshCounts();
    } catch (error) {
      this.persistenceAvailable.set(false);
      this.logger.warn('Could not read IndexedDB upload queue:', error);
    }
  }

  private browserIsOnline(): boolean {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `upload-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && error && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
    return 'Unknown upload error';
  }
}

/** Supabase Storage reports an existing object with different error shapes. */
export function isDuplicateStorageError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { status?: number; statusCode?: number | string; message?: string };
  const status = Number(candidate.statusCode ?? candidate.status);
  const message = candidate.message?.toLowerCase() ?? '';
  return status === 409 || message.includes('already exists') || message.includes('duplicate');
}
