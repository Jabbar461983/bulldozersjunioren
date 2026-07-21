import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { Rolle, User } from '../types/database';

interface SignUpInput {
  email: string;
  password: string;
  name: string;
  rolle: Rolle;
  teamId: string | null;
}

interface AuthContextValue {
  session: Session | null;
  profile: User | null;
  loading: boolean;
  signUp: (input: SignUpInput) => Promise<{ needsEmailConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Profil konnte nicht geladen werden:', error.message);
      setProfile(null);
      return;
    }
    setProfile(data);
  }, []);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      if (data.session) {
        await loadProfile(data.session.user.id);
      }
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        setSession(nextSession);
        if (nextSession) {
          await loadProfile(nextSession.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = useCallback(async ({ email, password, name, rolle, teamId }: SignUpInput) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          rolle,
          team_id: teamId,
        },
      },
    });

    if (error) throw error;

    // Ohne aktive Session muss die E-Mail-Adresse zuerst bestaetigt werden.
    return { needsEmailConfirmation: !data.session };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session) {
      await loadProfile(session.user.id);
    }
  }, [session, loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({ session, profile, loading, signUp, signIn, signOut, refreshProfile }),
    [session, profile, loading, signUp, signIn, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth muss innerhalb eines AuthProvider verwendet werden.');
  }
  return ctx;
}
