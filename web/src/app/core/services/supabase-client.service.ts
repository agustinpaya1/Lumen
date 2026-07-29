import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '@environments/environment';

/**
 * Owns the single Supabase client instance for the app. Extracted out of
 * SupabaseService so SessionService can also reach `auth` without the two
 * services depending on each other.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseClientService {
  readonly client: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseKey
  );
}
