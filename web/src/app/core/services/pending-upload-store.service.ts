import { inject, Injectable, InjectionToken } from '@angular/core';
import { PendingUpload } from '@core/models/pending-upload';

const DATABASE_NAME = 'lumen_upload_queue';
const DATABASE_VERSION = 1;
const STORE_NAME = 'uploads';
const EVENT_INDEX = 'eventKey';

/** Small persistence contract so queue orchestration can be tested in memory. */
export interface PendingUploadStore {
  get(id: string): Promise<PendingUpload | undefined>;
  getForEvent(eventKey: string): Promise<PendingUpload[]>;
  put(item: PendingUpload): Promise<void>;
  delete(id: string): Promise<void>;
}

@Injectable({ providedIn: 'root' })
export class IndexedDbPendingUploadStore implements PendingUploadStore {
  private databasePromise: Promise<IDBDatabase> | null = null;

  async get(id: string): Promise<PendingUpload | undefined> {
    const database = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(id);
      request.onsuccess = () => resolve(request.result as PendingUpload | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  async getForEvent(eventKey: string): Promise<PendingUpload[]> {
    const database = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction
        .objectStore(STORE_NAME)
        .index(EVENT_INDEX)
        .getAll(IDBKeyRange.only(eventKey));

      request.onsuccess = () => {
        const items = request.result as PendingUpload[];
        resolve(items.sort((left, right) => left.createdAt - right.createdAt));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async put(item: PendingUpload): Promise<void> {
    await this.write('put', item);
  }

  async delete(id: string): Promise<void> {
    await this.write('delete', id);
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise;

    if (typeof indexedDB === 'undefined') {
      return Promise.reject(new Error('IndexedDB is not available in this browser.'));
    }

    this.databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex(EVENT_INDEX, EVENT_INDEX, { unique: false });
        }
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => {
          database.close();
          this.databasePromise = null;
        };
        resolve(database);
      };
      request.onerror = () => {
        this.databasePromise = null;
        reject(request.error);
      };
      request.onblocked = () => {
        this.databasePromise = null;
        reject(new Error('IndexedDB upgrade was blocked by another Lumen tab.'));
      };
    });

    return this.databasePromise;
  }

  private async write(operation: 'put' | 'delete', value: PendingUpload | string): Promise<void> {
    const database = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      if (operation === 'put') {
        store.put(value as PendingUpload);
      } else {
        store.delete(value as string);
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }
}

export const PENDING_UPLOAD_STORE = new InjectionToken<PendingUploadStore>(
  'PENDING_UPLOAD_STORE',
  { factory: () => inject(IndexedDbPendingUploadStore) }
);
