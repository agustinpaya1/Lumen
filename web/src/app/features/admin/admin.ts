import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminAccessService } from '@core/services/admin-access.service';
import { EventService } from '@core/services/event.service';
import { SessionService } from '@core/services/session.service';
import { Photo } from '@core/models/photo';
import { triggerBrowserDownload } from '@core/utils/download';

@Component({
  selector: 'app-admin',
  imports: [FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class AdminComponent implements OnInit {
  readonly access = inject(AdminAccessService);
  readonly event = inject(EventService);
  private readonly session = inject(SessionService);
  readonly eventKey = this.session.getStoredEventKey();
  readonly albumUrl = '/home?e=' + encodeURIComponent(this.eventKey);
  readonly isAuthenticated = signal(false);
  readonly busy = signal(false);
  readonly message = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly registering = signal(false);
  readonly photos = signal<Photo[]>([]);
  readonly confirmLaunch = signal(false);
  readonly deleteConfirmId = signal<number | null>(null);
  async ngOnInit(): Promise<void> {
    await this.event.initialize();
    try {
      await this.checkAccess();
    } catch {
      this.message.set('No se pudo comprobar la sesión. Inicia sesión de nuevo.');
    }
  }
  private async checkAccess(): Promise<void> {
    const allowed = await this.access.hasAccess(this.eventKey);
    this.isAuthenticated.set(allowed);
    if (allowed) await this.loadPhotos();
  }
  async authenticate(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.message.set('');
    try {
      if (this.registering()) {
        await this.access.register(this.email(), this.password(), this.eventKey);
        this.message.set(
          'Revisa tu correo y confirma la cuenta. Después vuelve aquí e inicia sesión. La cuenta debe estar autorizada para este evento.',
        );
        this.registering.set(false);
      } else {
        await this.access.signIn(this.email(), this.password());
        await this.checkAccess();
        if (!this.isAuthenticated())
          this.message.set(
            'La cuenta no tiene acceso a este evento. Comprueba que tu correo está autorizado y confirmado.',
          );
      }
      this.password.set('');
    } catch {
      this.message.set(
        'No se pudo completar el acceso. Comprueba el correo, la contraseña y la confirmación de tu cuenta; si acabas de solicitar un correo, espera un minuto antes de reintentarlo.',
      );
    } finally {
      this.busy.set(false);
    }
  }
  async logout(): Promise<void> {
    const { error } = await this.access.client.auth.signOut({ scope: 'local' });
    if (error) {
      this.message.set('No se pudo cerrar la sesión. Inténtalo de nuevo.');
      return;
    }
    this.isAuthenticated.set(false);
    this.photos.set([]);
    this.message.set('');
  }
  async setOpen(): Promise<void> {
    if (this.busy() || !this.isAuthenticated()) return;
    this.busy.set(true);
    this.message.set('');
    try {
      const { error } = await this.access.client.rpc('set_event_uploads_open', {
        p_event_key: this.eventKey,
        p_open: !this.event.canUpload(),
      });
      if (error) throw error;
      await this.event.refresh();
      if (this.event.error()) throw new Error('State refresh failed');
      this.confirmLaunch.set(false);
      this.message.set(
        this.event.canUpload()
          ? '¡Álbum abierto! Los invitados pueden compartir sus fotos.'
          : 'El evento muestra la invitación. Las fotos existentes siguen guardadas.',
      );
    } catch {
      this.message.set(
        'No se ha podido confirmar el cambio. Recarga antes de intentarlo de nuevo.',
      );
    } finally {
      this.busy.set(false);
    }
  }
  async loadPhotos(): Promise<void> {
    const { data, error } = await this.access.client
      .from('photos')
      .select('*')
      .eq('event_key', this.eventKey)
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) throw error;
    this.photos.set(data ?? []);
  }
  async refresh(): Promise<void> {
    this.busy.set(true);
    try {
      await this.event.refresh();
      await this.loadPhotos();
    } catch {
      this.message.set('No se pudo actualizar el panel.');
    } finally {
      this.busy.set(false);
    }
  }
  async deletePhoto(id: number): Promise<void> {
    if (this.busy()) return;
    const photo = this.photos().find((p) => p.id === id);
    if (!photo) return;
    this.busy.set(true);
    this.message.set('');
    try {
      // Storage policies resolve ownership through the row, so remove the object first.
      const storage = await this.access.client.storage.from('photos').remove([photo.url]);
      if (storage.error) throw storage.error;
      const row = await this.access.client
        .from('photos')
        .delete()
        .eq('id', id)
        .eq('event_key', this.eventKey)
        .select('id');
      if (row.error || !row.data?.length) throw row.error ?? new Error('No row deleted');
      this.photos.update((p) => p.filter((photo) => photo.id !== id));
      this.deleteConfirmId.set(null);
    } catch {
      this.message.set(
        'No se pudo completar el borrado. Si la imagen ya no aparece, reintenta para retirar su registro del álbum.',
      );
    } finally {
      this.busy.set(false);
    }
  }
  getPhotoUrl(path: string): string {
    return this.access.client.storage.from('photos').getPublicUrl(path).data.publicUrl;
  }
  async downloadPhoto(photo: Photo): Promise<void> {
    try {
      const { data, error } = await this.access.client.storage
        .from('photos')
        .createSignedUrl(photo.url, 60, { download: 'lumen_' + photo.id + '.jpg' });
      if (error || !data?.signedUrl) throw error ?? new Error('Missing URL');
      triggerBrowserDownload(data.signedUrl, 'lumen_' + photo.id + '.jpg', '_blank');
    } catch {
      this.message.set('No se pudo preparar la descarga. Inténtalo con conexión.');
    }
  }
}
