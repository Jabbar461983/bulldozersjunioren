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
import { wendeTeamThemeAn } from '../lib/theme';
import type { Rolle, Team, User } from '../types/database';

interface SignUpInput {
  email: string;
  password: string;
  vorname: string;
  nachname: string;
  rolle: Rolle;
  teamId: string | null;
}

interface AuthContextValue {
  session: Session | null;
  profile: User | null;
  team: Team | null;
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
  const [team, setTeam] = useState<Team | null>(null);
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
      setTeam(null);
      return;
    }
    setProfile(data);

    if (data?.team_id) {
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', data.team_id)
        .maybeSingle();
      setTeam(teamData);
    } else {
      setTeam(null);
    }
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
          setTeam(null);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = useCallback(
    async ({ email, password, vorname, nachname, rolle, teamId }: SignUpInput) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            vorname,
            nachname,
            rolle,
            team_id: teamId,
          },
        },
      });

      if (error) throw error;

      // Ohne aktive Session muss die E-Mail-Adresse zuerst bestätigt werden.
      return { needsEmailConfirmation: !data.session };
    },
    []
  );

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

  // Vereinsfarben (Phase 6) als CSS-Design-Tokens auf die gesamte App anwenden,
  // sobald sich das Team des eingeloggten Nutzers ändert (z. B. Login/Logout,
  // Admin passt Farben an und ein Refresh lädt sie neu).
  useEffect(() => {
    wendeTeamThemeAn(team);
  }, [team]);

  const value = useMemo<AuthContextValue>(
    () => ({ session, profile, team, loading, signUp, signIn, signOut, refreshProfile }),
    [session, profile, team, loading, signUp, signIn, signOut, refreshProfile]
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
