import { useEffect, useState } from 'react';
import { subscribeSession, type SessionState } from '../lib/supabase';

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ session: null, role: null, email: null, loading: true });
  useEffect(() => subscribeSession(setState), []);
  return state;
}
