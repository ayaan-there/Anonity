import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';

export const authReady = url.length > 0 && anonKey.length > 0;

export const supabase: SupabaseClient | null = authReady ? createClient(url, anonKey) : null;

export type AuthSession = { user: User; email: string };

export async function currentSession(): Promise<AuthSession | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user?.email) return null;
  return { user, email: user.email };
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) throw new Error('auth not configured');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signUpWithEmail(email: string, password: string, role: 'hunter' | 'org') {
  if (!supabase) throw new Error('auth not configured');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role } },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
