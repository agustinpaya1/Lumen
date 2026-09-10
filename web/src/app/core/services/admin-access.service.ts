import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { environment } from '@environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminAccessService {
  // A second storage key avoids replacing the guest's anonymous ownership or
  // invalidating queued offline photos when the operator signs in/out.
  readonly client = createClient(environment.supabaseUrl, environment.supabaseKey, {
    auth: { storageKey: 'lumen-admin-session', detectSessionInUrl: false },
  });

  async hasAccess(eventKey: string): Promise<boolean> {
    const {
      data: { session },
    } = await this.client.auth.getSession();
    if (!session) return false;
    const { data, error } = await this.client.rpc('is_event_admin', { p_event_key: eventKey });
    if (error) throw error;
    return data === true;
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }

  async register(email: string, password: string, eventKey: string): Promise<void> {
    const redirect = new URL('/admin', window.location.origin);
    redirect.searchParams.set('e', eventKey);
    const { error } = await this.client.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: redirect.href },
    });
    if (error) throw error;
  }
}
