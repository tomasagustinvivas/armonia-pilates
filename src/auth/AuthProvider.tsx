import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { Profile } from '../types';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchMyProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, phone, notes, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

async function ensureMyProfile(userId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (existing) return;

  const { error } = await supabase.from('profiles').insert({
    id: userId,
    role: 'student',
  });

  if (error && error.code !== '23505') throw error;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const user = session?.user ?? null;

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const nextProfile = await fetchMyProfile(user.id);
    setProfile(nextProfile);
  };

  useEffect(() => {
    const supabase = (() => {
      try {
        return getSupabaseClient();
      } catch {
        return null;
      }
    })();

    if (!supabase) {
      setSession(null);
      setProfile(null);
      setIsLoading(false);
      return;
    }

    let isActive = true;

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!isActive) return;

        setSession(data.session);
        if (data.session?.user) {
          try {
            await ensureMyProfile(data.session.user.id);
            const nextProfile = await fetchMyProfile(data.session.user.id);
            setProfile(nextProfile);
          } catch {
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      } catch {
        if (!isActive) return;
        setSession(null);
        setProfile(null);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, nextSession: Session | null) => {
        setSession(nextSession);

        if (nextSession?.user) {
          setIsLoading(true);
          try {
            try {
              await ensureMyProfile(nextSession.user.id);
              const nextProfile = await fetchMyProfile(nextSession.user.id);
              setProfile(nextProfile);
            } catch {
              setProfile(null);
            }
          } finally {
            setIsLoading(false);
          }
        } else {
          setProfile(null);
        }
      },
    );

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      isLoading,
      refreshProfile,
      signOut,
    }),
    [session, user, profile, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
