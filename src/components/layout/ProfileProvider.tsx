"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

interface ProfileContextValue {
  activeProfileId: string | null;
  setActiveProfileId: (id: string) => void;
}

const ProfileContext = createContext<ProfileContextValue>({
  activeProfileId: null,
  setActiveProfileId: () => {},
});

const STORAGE_KEY = "ht_active_profile";

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);

  // Hydrate from localStorage on mount; fall back to first profile if stored id is gone
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // Fetch profiles to auto-select the first one
      fetch("/api/profiles")
        .then((r) => r.json())
        .then((profiles: { id: string }[]) => {
          if (profiles.length > 0) {
            setActiveProfileIdState(profiles[0].id);
            localStorage.setItem(STORAGE_KEY, profiles[0].id);
          }
        })
        .catch(() => {});
      return;
    }
    // Verify the stored id still exists
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((profiles: { id: string }[]) => {
        const valid = profiles.some((p) => p.id === stored);
        if (valid) {
          setActiveProfileIdState(stored);
        } else if (profiles.length > 0) {
          setActiveProfileIdState(profiles[0].id);
          localStorage.setItem(STORAGE_KEY, profiles[0].id);
        }
      })
      .catch(() => {
        setActiveProfileIdState(stored);
      });
  }, []);

  function setActiveProfileId(id: string) {
    setActiveProfileIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }

  return (
    <ProfileContext.Provider value={{ activeProfileId, setActiveProfileId }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
