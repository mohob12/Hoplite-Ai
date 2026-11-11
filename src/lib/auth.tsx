import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

type AuthState =
  | { status: 'loading' }
  | { status: 'signed_out' }
  | { status: 'not_admin'; session: Session }
  | { status: 'admin'; session: Session };

const AuthContext = createContext<AuthState>({ status: 'loading' });

async function resolve(session: Session | null): Promise<AuthState> {
  if (!session) return { status: 'signed_out' };
  const { data, error } = await supabase.rpc('is_admin');
  if (error) return { status: 'not_admin', session };
  return data ? { status: 'admin', session } : { status: 'not_admin', session };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const s = await resolve(data.session);
      if (active) setState(s);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') return;
      // Defer: supabase-js forbids awaiting other client calls inside this callback.
      setTimeout(async () => {
        const s = await resolve(session);
        if (active) setState(s);
      }, 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
