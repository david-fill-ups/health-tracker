"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

interface ProfileData {
  id: string;
  heightIn: number | null;
  birthDate: string;
}

interface ProfileContextValue {
  activeProfileId: string | null;
  setActiveProfileId: (id: string) => void;
  activeProfile: ProfileData | null;
}

const ProfileContext = createContext<ProfileContextValue>({
  activeProfileId: null,
  setActiveProfileId: () => {},
  activeProfile: null,
});

const STORAGE_KEY = "ht_active_profile";

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ProfileData[]>([]);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? null;

  // Hydrate from localStorage on mount; fall back to first profile if stored id is gone
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // Fetch profiles to auto-select the first one
      fetch("/api/profiles")
        .then((r) => r.json())
        .then((fetchedProfiles: { id: string; heightIn?: number | null; birthDate: string }[]) => {
          setProfiles(
            fetchedProfiles.map((p) => ({ id: p.id, heightIn: p.heightIn ?? null, birthDate: p.birthDate }))
          );
          if (fetchedProfiles.length > 0) {
            setActiveProfileIdState(fetchedProfiles[0].id);
            localStorage.setItem(STORAGE_KEY, fetchedProfiles[0].id);
          }
        })
        .catch(() => {});
      return;
    }
    // Verify the stored id still exists
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((fetchedProfiles: { id: string; heightIn?: number | null; birthDate: string }[]) => {
        setProfiles(
          fetchedProfiles.map((p) => ({ id: p.id, heightIn: p.heightIn ?? null, birthDate: p.birthDate }))
        );
        const valid = fetchedProfiles.some((p) => p.id === stored);
        if (valid) {
          setActiveProfileIdState(stored);
        } else if (fetchedProfiles.length > 0) {
          setActiveProfileIdState(fetchedProfiles[0].id);
          localStorage.setItem(STORAGE_KEY, fetchedProfiles[0].id);
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
    <ProfileContext.Provider value={{ activeProfileId, setActiveProfileId, activeProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
