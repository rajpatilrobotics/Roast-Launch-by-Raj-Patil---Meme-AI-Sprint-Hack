import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

const STORAGE_KEY = "roastlaunch_user";

type UserContextType = {
  userName: string | null;
  setUserName: (name: string) => void;
  clearUser: () => void;
};

const UserContext = createContext<UserContextType>({
  userName: null,
  setUserName: () => {},
  clearUser: () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [userName, setUserNameState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });

  function setUserName(name: string) {
    setUserNameState(name);
    try {
      localStorage.setItem(STORAGE_KEY, name);
    } catch {}
  }

  function clearUser() {
    setUserNameState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  return (
    <UserContext.Provider value={{ userName, setUserName, clearUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
