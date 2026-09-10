export type PendingUploadStage = 'queued' | 'storage-uploaded';

/**
 * Durable client-side representation of a photo that has not been fully
 * published yet. Blobs are stored in IndexedDB because localStorage cannot
 * safely or efficiently hold binary image data.
 */
export interface PendingUpload {
  id: string;
  eventKey: string;
  deviceId: string;
  storagePath: string;
  dedication: string;
  image: Blob;
  createdAt: number;
  stage: PendingUploadStage;
  attempts: number;
  lastError?: string;
}

export type EnqueueResult = 'published' | 'queued';

export interface UploadProgressHooks {
  onStorageRetry?: (attemptNumber: number, maxAttempts: number) => void;
  onMetadataRetry?: (attemptNumber: number, maxAttempts: number) => void;
  onStorageComplete?: () => void;
}
