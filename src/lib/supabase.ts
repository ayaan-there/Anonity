import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';

export const authReady = url.length > 0 && anonKey.length > 0;

export const supabase: SupabaseClient | null = authReady ? createClient(url, anonKey) : null;

export type AuthSession = { user: User; email: string };

export type AccountRole = 'hunter' | 'org';

// ── Live session store (UI-subscribable) ──────────────────────────

export type SessionState = {
  session: import('@supabase/supabase-js').Session | null;
  role: AccountRole | null;
  email: string | null;
  loading: boolean;
};

const listeners = new Set<(s: SessionState) => void>();
let current: SessionState = { session: null, role: null, email: null, loading: true };

const emit = (next: SessionState) => {
  current = next;
  for (const l of listeners) l(next);
};

export const subscribeSession = (fn: (s: SessionState) => void) => {
  listeners.add(fn);
  fn(current);
  return () => { listeners.delete(fn); };
};

const readRole = async (userId: string): Promise<AccountRole | null> => {
  if (!supabase) return null;
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  return (data?.role as AccountRole) ?? null;
};

export async function initAuth(): Promise<void> {
  if (!supabase) { emit({ session: null, role: null, email: null, loading: false }); return; }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const role = session?.user ? await readRole(session.user.id) : null;
  emit({ session, role, email: session?.user?.email ?? null, loading: false });

  supabase.auth.onAuthStateChange(async (_event, s) => {
    if (s?.user) {
      const r = await readRole(s.user.id);
      emit({ session: s, role: r, email: s.user.email ?? null, loading: false });
    } else {
      emit({ session: null, role: null, email: null, loading: false });
    }
  });
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) throw new Error('auth not configured');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const role = data.user ? await readRole(data.user.id) : null;
  if (role === 'hunter' && data.user?.user_metadata?.wallet_address) {
    await saveProfileWalletAddress(String(data.user.user_metadata.wallet_address));
  }
  emit({ session: data.session, role, email: data.user?.email ?? null, loading: false });
  return { session: data.session, role };
}

export async function signUpWithEmail(email: string, password: string, role: AccountRole, walletAddress = '') {
  if (!supabase) throw new Error('auth not configured');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role, ...(walletAddress.trim() ? { wallet_address: walletAddress.trim() } : {}) } },
  });
  if (error) throw error;
  return data;
}

export async function saveProfileWalletAddress(walletAddress: string): Promise<boolean> {
  if (!supabase) return false;
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user || !walletAddress.trim()) return false;
  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email ?? '',
    role: 'hunter',
    wallet_address: walletAddress.trim(),
  });
  return !error;
}

export async function getProfileWalletAddress(): Promise<string | null> {
  if (!supabase) return null;
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data } = await supabase.from('profiles').select('wallet_address').eq('id', userData.user.id).maybeSingle();
  return (data?.wallet_address as string | null | undefined)?.trim() || null;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
  emit({ session: null, role: null, email: null, loading: false });
}
