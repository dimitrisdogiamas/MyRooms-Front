import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as LocalAuthentication from "expo-local-authentication";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/lib/supabase";
import { useSettings } from "./SettingsProvider";

WebBrowser.maybeCompleteAuthSession();

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  unlocked: boolean;
  unlock: () => Promise<void>;
  lock: () => void;
  register: (email: string, password: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<void>;
}


export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const { settings, ready: settingsReady } = useSettings();

  useEffect(() => {
    if (!settingsReady) return;

    let cancelled = false;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      setSession(data.session);
      if (data.session && !settings.biometricLock) {
        setUnlocked(true);
      } else {
        setUnlocked(false);
      }
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);

      if (event === "SIGNED_OUT" || !nextSession) {
        setUnlocked(false);
        return;
      }

      // Fresh password login: enter app now.
      // Next cold start will require biometrics if enabled.
      if (event === "SIGNED_IN") {
        setUnlocked(true);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
    // Only re-run when settings finish hydrating — not when toggle changes mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsReady]);

  // Turning biometric OFF while logged in should not trap the user.
  useEffect(() => {
    if (settingsReady && session && !settings.biometricLock) {
      setUnlocked(true);
    }
  }, [settingsReady, session, settings.biometricLock]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    setSession(null);
    setUnlocked(false);
    if (error) throw error;
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      options: {
        emailRedirectTo: "myrooms://login",
      },
      email,
      password,
    });
    if (error) throw error;
    return !data.session;
  }, []);

  const unlock = useCallback(async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !enrolled) {
      setUnlocked(true);
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Ξεκλείδωμα εφαρμογής",
      cancelLabel: "Ακύρωση",
    });
    if (result.success) {
      setUnlocked(true);
    }
  }, []);

  const lock = useCallback(() => {
    setUnlocked(false);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const redirectTo = Linking.createURL("auth/callback");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        skipBrowserRedirect: true,
        redirectTo,
      },
    });
    console.log("Google OAuth URL:", {data, error, redirectTo});
    if (error) throw error;
    if (!data.url) throw new Error("Δεν ήταν δυνατή η δημιουργία σύνδεσης με Google.");

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== "success") return;

    const { queryParams } = Linking.parse(result.url);
    const code = queryParams?.code;
    if (typeof code !== "string") {
      throw new Error("Δεν ελήφθη κωδικός σύνδεσης από το Google.");
    }

    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        loading: loading || !settingsReady,
        signIn,
        signOut,
        unlocked,
        unlock,
        lock,
        register,
        signInWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
