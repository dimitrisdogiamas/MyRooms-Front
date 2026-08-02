import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AppSettings = {
  theme: "light" | "dark" | "system";
  fontScale: number;
  notifyArrival: boolean;
  notifyDeparture: boolean;
  minNights: number;
  compactMode: boolean;
};

const STORAGE_KEY = "settings";

const defaultSettings: AppSettings = {
  theme: "system",
  fontScale: 1,
  notifyArrival: true,
  notifyDeparture: true,
  minNights: 1,
  compactMode: false,
};

const SettingsContext = createContext<{
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  saveSettings: () => Promise<void>;
} | undefined>(undefined);

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider");
  return ctx;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<AppSettings>(defaultSettings);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as AppSettings;
        setSettingsState({ ...defaultSettings, ...parsed });
      } catch {
        // ignore corrupt storage
      }
    })();
  }, []);

  const setSettings = useCallback((next: AppSettings) => {
    setSettingsState(next);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const saveSettings = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, setSettings, saveSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
