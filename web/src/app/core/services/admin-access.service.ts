import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { environment } from '@environments/environment';

const RECOVERY_SESSION_KEY = 'lumen-admin-password-recovery';

@Injectable({ providedIn: 'root' })
export class AdminAccessService {
  // A second storage key avoids replacing the guest's anonymous ownership or
  // invalidating queued offline photos when the operator signs in/out.
  readonly client = createClient(
    environment.supabaseUrl || 'https://placeholder.supabase.co',
    environment.supabaseKey || 'placeholder-anon-key',
    {
      auth: { storageKey: 'lumen-admin-session', detectSessionInUrl: false },
    }
  );

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
    const { error } = await this.client.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: this.confirmationUrl(eventKey) },
    });
    if (error) throw error;
  }

  async resendConfirmation(email: string, eventKey: string): Promise<void> {
    const { error } = await this.client.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: this.confirmationUrl(eventKey) },
    });
    if (error) throw error;
  }

  async requestPasswordReset(email: string, eventKey: string): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: this.confirmationUrl(eventKey),
    });
    if (error) throw error;
  }

  async beginPasswordRecovery(): Promise<boolean> {
    const url = new URL(window.location.href);
    const callback = new URLSearchParams(url.hash.slice(1));
    if (callback.get('type') === 'recovery' || callback.get('error_code') === 'otp_expired') {
      url.hash = '';
      window.history.replaceState(window.history.state, '', url);
      const access_token = callback.get('access_token');
      const refresh_token = callback.get('refresh_token');
      if (!access_token || !refresh_token) throw new Error('Invalid recovery link');
      const { data, error } = await this.client.auth.setSession({ access_token, refresh_token });
      if (error || !data.session) throw error ?? new Error('Missing recovery session');
      window.sessionStorage.setItem(RECOVERY_SESSION_KEY, data.session.user.id);
      return true;
    }

    const recoveryUser = window.sessionStorage.getItem(RECOVERY_SESSION_KEY);
    if (!recoveryUser) return false;
    const { data } = await this.client.auth.getSession();
    if (data.session?.user.id === recoveryUser) return true;
    window.sessionStorage.removeItem(RECOVERY_SESSION_KEY);
    return false;
  }

  async updatePassword(password: string): Promise<void> {
    const { error } = await this.client.auth.updateUser({ password });
    if (error) throw error;
    window.sessionStorage.removeItem(RECOVERY_SESSION_KEY);
  }

  private confirmationUrl(eventKey: string): string {
    const redirect = new URL('/admin', window.location.origin);
    redirect.searchParams.set('e', eventKey);
    return redirect.href;
  }
}
