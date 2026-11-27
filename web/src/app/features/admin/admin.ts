import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminAccessService } from '@core/services/admin-access.service';
import { EventService } from '@core/services/event.service';
import { SessionService } from '@core/services/session.service';
import { Photo } from '@core/models/photo';
import { PHOTO_SAVE_HINT, PhotoSaver } from '@core/utils/save-photo';
import { DEFAULT_PHOTO_LIMIT } from '@core/constants';
import { isAuthError } from '@supabase/supabase-js';
import { draftFromEvent, eventColorFields, normalizeSettings, themeTextFields } from './event-settings';

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
  readonly checkingSession = signal(true);
  readonly busy = signal(false);
  readonly message = signal('');
  readonly messageIsError = signal(false);
  readonly canResendConfirmation = signal(false);
  readonly email = signal('');
  readonly password = signal('');
  readonly registering = signal(false);
  readonly photos = signal<Photo[]>([]);
  readonly confirmLaunch = signal(false);
  readonly deleteConfirmId = signal<number | null>(null);
  readonly section = signal<'photos' | 'settings'>('photos');
  readonly colorFields = Object.entries(eventColorFields) as [keyof typeof eventColorFields, string][];
  readonly textFields = Object.entries(themeTextFields) as [keyof typeof themeTextFields, string][];
  draft = this.makeDraft();
  prompts = '';

  async ngOnInit(): Promise<void> {
    try {
      await this.event.initialize();
      await this.checkAccess();
    } catch {
      this.notify('No se pudo cargar el panel. Puedes volver a intentarlo.', true);
    } finally {
      this.checkingSession.set(false);
    }
  }
  private async checkAccess(): Promise<void> {
    const allowed = await this.access.hasAccess(this.eventKey);
    this.isAuthenticated.set(allowed);
    if (allowed) {
      try {
        await this.loadPhotos();
      } catch {
        this.notify('Tu sesión está activa. No se pudieron cargar las fotos. Pulsa Actualizar.', true);
      }
    }
  }
  async authenticate(valid: boolean | null): Promise<void> {
    if (this.busy() || !valid) return;
    this.busy.set(true);
    this.message.set('');
    this.canResendConfirmation.set(false);
    try {
      if (this.registering()) {
        await this.access.register(this.email(), this.password(), this.eventKey);
        this.registering.set(false);
        this.canResendConfirmation.set(true);
        this.notify('Revisa tu correo y confirma la cuenta. Después vuelve aquí e inicia sesión.');
      } else {
        await this.access.signIn(this.email(), this.password());
        await this.checkAccess();
        if (!this.isAuthenticated())
          this.notify(
            'Has iniciado sesión, pero este correo no está autorizado para administrar el evento.',
            true,
          );
      }
      this.password.set('');
    } catch (error) {
      this.showAuthError(error);
    } finally {
      this.busy.set(false);
    }
  }

  async resendConfirmation(): Promise<void> {
    if (this.busy() || !this.email().trim()) return;
    this.busy.set(true);
    try {
      await this.access.resendConfirmation(this.email(), this.eventKey);
      this.notify('Si la confirmación está pendiente, recibirás un correo con el enlace.');
    } catch (error) {
      this.showAuthError(error);
    } finally {
      this.busy.set(false);
    }
  }

  private showAuthError(error: unknown): void {
    const code = isAuthError(error) ? error.code : undefined;
    switch (code) {
      case 'email_not_confirmed':
        this.canResendConfirmation.set(true);
        this.notify('Confirma tu correo para poder entrar al panel.', true);
        break;
      case 'invalid_credentials':
        this.notify('El correo o la contraseña no son correctos.', true);
        break;
      case 'over_email_send_rate_limit':
      case 'over_request_rate_limit':
        this.notify('Has hecho demasiados intentos. Espera unos minutos antes de volver a probar.', true);
        break;
      case 'email_address_not_authorized':
        this.notify('Supabase no pudo enviar el correo de confirmación a esta dirección.', true);
        break;
      case 'weak_password':
        this.notify('La contraseña no cumple los requisitos. Elige una más segura.', true);
        break;
      default:
        this.notify('No se pudo completar la solicitud. Inténtalo de nuevo en unos minutos.', true);
    }
  }

  toggleRegistration(): void {
    this.registering.update(value => !value);
    this.password.set('');
    this.canResendConfirmation.set(false);
    this.message.set('');
  }

  private notify(message: string, error = false): void {
    this.messageIsError.set(error);
    this.message.set(message);
  }

  showSection(section: 'photos' | 'settings'): void {
    if (this.section() === section || this.busy()) return;
    this.message.set('');
    this.section.set(section);
    if (section === 'settings') this.resetDraft();
  }

  private makeDraft() {
    const draft = draftFromEvent(this.event.state());
    draft.photo_limit ??= DEFAULT_PHOTO_LIMIT;
    return draft;
  }

  resetDraft(): void {
    this.draft = this.makeDraft();
    this.prompts = this.draft.theme.photoPrompts?.join('\n') ?? '';
  }

  addPlace(): void {
    (this.draft.theme.places ??= []).push({ title: '' });
  }

  removePlace(index: number): void {
    this.draft.theme.places?.splice(index, 1);
  }

  pickerValue(value?: string): string {
    return value && /^#[\da-f]{6}$/i.test(value) ? value : '#53653c';
  }

  async saveSettings(): Promise<void> {
    if (this.busy() || !this.isAuthenticated() || !this.event.state()) return;
    let settings;
    try {
      settings = normalizeSettings(this.draft, this.prompts);
    } catch (error) {
      this.notify(error instanceof Error ? error.message : 'Revisa los campos del evento.', true);
      return;
    }
    this.busy.set(true);
    try {
      const { error } = await this.access.client.from('events').update(settings)
        .eq('event_key', this.eventKey).select('event_key').single();
      if (error) throw error;
      await this.event.refresh();
      if (this.event.error()) {
        this.notify('La configuración se guardó. Recarga el panel para ver los cambios.');
        return;
      }
      this.resetDraft();
      this.notify('Cambios publicados.');
    } catch {
      this.notify('No se pudieron guardar los cambios. Comprueba tu sesión y vuelve a intentarlo.', true);
    } finally {
      this.busy.set(false);
    }
  }
  async logout(): Promise<void> {
    const { error } = await this.access.client.auth.signOut({ scope: 'local' });
    if (error) {
      this.notify('No se pudo cerrar la sesión. Inténtalo de nuevo.', true);
      return;
    }
    this.isAuthenticated.set(false);
    this.section.set('photos');
    this.confirmLaunch.set(false);
    this.deleteConfirmId.set(null);
    this.saveUrl = undefined;
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
      this.notify(
        this.event.canUpload()
          ? '¡Álbum abierto! Los invitados pueden compartir sus fotos.'
          : 'El evento muestra la invitación. Las fotos existentes siguen guardadas.',
      );
    } catch {
      this.notify(
        'No se ha podido confirmar el cambio. Recarga antes de intentarlo de nuevo.',
        true,
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
      this.notify('No se pudo actualizar el panel.', true);
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
      this.notify(
        'No se pudo completar el borrado. Si la imagen ya no aparece, reintenta para retirar su registro del álbum.',
        true,
      );
    } finally {
      this.busy.set(false);
    }
  }
  getPhotoUrl(path: string): string {
    return this.access.client.storage.from('photos').getPublicUrl(path).data.publicUrl;
  }
  private readonly photoSaver = new PhotoSaver();
  private saveUrl?: { id: number; url: string };

  async downloadPhoto(photo: Photo): Promise<void> {
    try {
      this.notify(PHOTO_SAVE_HINT);
      if (this.saveUrl?.id !== photo.id) {
        const { data, error } = await this.access.client.storage
          .from('photos').createSignedUrl(photo.url, 60);
        if (error || !data?.signedUrl) throw error ?? new Error('Missing URL');
        this.saveUrl = { id: photo.id, url: data.signedUrl };
      }
      this.notify(await this.photoSaver.saveUrl(this.saveUrl.url, 'lumen_' + photo.id + '.jpg'));
    } catch {
      this.saveUrl = undefined;
      this.notify('No se pudo preparar la descarga. Inténtalo con conexión.', true);
    }
  }
}
