import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
// Asegúrate de que esta ruta es correcta. Si te da error, ajusta los '../'
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  // Getter público para acceder al cliente si fuera necesario
  get client() {
    return this.supabase;
  }

  // --- MÉTODOS PARA FOTOS (MVP) ---

  /**
   * Sube un archivo al bucket 'photos' de Supabase
   * @param file El archivo de imagen real
   * @param path La ruta dentro del bucket (ej: 'boda-primo/foto1.jpg')
   */
  async uploadPhoto(file: File, path: string) {
    return this.supabase.storage
      .from('photos') // Asegúrate de crear este bucket en tu dashboard de Supabase
      .upload(path, file);
  }

  /**
   * Guarda los metadatos de la foto en la base de datos
   */
  async savePhotoData(url: string, eventId: string) {
    return this.supabase.from('photos').insert({
      url: url,
      event_id: eventId,
      created_at: new Date()
    });
  }
}