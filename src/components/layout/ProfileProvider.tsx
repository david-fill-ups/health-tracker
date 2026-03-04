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

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setActiveProfileIdState(stored);
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
