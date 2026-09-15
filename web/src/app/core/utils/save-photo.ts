import { triggerBrowserDownload } from './download';

export const PHOTO_SAVE_HINT = 'En las opciones del teléfono, elige «Guardar imagen» o tu aplicación de fotos.';
const RETRY_HINT = 'Foto preparada. Pulsa Guardar otra vez para abrir las opciones del teléfono.';

/** Keeps only the last image so a second tap can share without awaiting a fetch. */
export class PhotoSaver {
  private prepared?: { url: string; blob: Blob };

  async saveUrl(url: string, filename: string): Promise<string> {
    if (this.prepared?.url !== url) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
      this.prepared = { url, blob: await response.blob() };
    }
    return savePhoto(this.prepared.blob, filename);
  }
}

/** Share the actual image, not its URL, so the OS can offer photo-library actions. */
export async function savePhoto(blob: Blob, filename: string): Promise<string> {
  const type = blob.type.split(';')[0] || 'image/jpeg';
  const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' } as Record<string, string>)[type];
  const file = new File([blob], extension ? filename.replace(/\.[^.]+$/, `.${extension}`) : filename, { type });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    if (navigator.userActivation?.isActive === false) return RETRY_HINT;
    try {
      await navigator.share({ files: [file] });
      return '';
    } catch (error) {
      const name = (error as { name?: string })?.name;
      if (name === 'AbortError') return '';
      // A slow fetch can outlive Safari's user activation. Keep the image for a new tap.
      if (name === 'NotAllowedError') return RETRY_HINT;
      throw error;
    }
  }

  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (mobile) {
    return 'Mantén pulsada la foto y abre sus opciones para guardarla en Fotos. Si no aparece esa opción, abre Lumen en Safari o Chrome.';
  }
  const url = URL.createObjectURL(file);
  try {
    triggerBrowserDownload(url, file.name);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return '';
}
