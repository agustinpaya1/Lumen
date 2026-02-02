import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

  get client() {
    return this.supabase;
  }

  async uploadPhoto(file: File, path: string) {
    return this.supabase.storage
      .from('photos')
      .upload(path, file);
  }

  async savePhotoData(url: string, eventId: string) {
    return this.supabase.from('photos').insert({
      url: url,
      event_id: eventId,
      created_at: new Date()
    });
  }
}