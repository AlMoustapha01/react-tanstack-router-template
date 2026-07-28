import { useCallback, useMemo, useState, type ReactNode } from "react";

import {
  AUTH_STORAGE_KEY,
  AuthContext,
  DEMO_PASSWORD,
  type Credentials,
  type User,
} from "./auth-context";

function readStoredUser(): User | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser);

  const login = useCallback(async (credentials: Credentials) => {
    if (credentials.password !== DEMO_PASSWORD) {
      throw new Error("Invalid email or password");
    }

    const nextUser: User = {
      id: "user-1",
      email: credentials.email,
      name: credentials.email.split("@")[0],
    };

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: user !== null, login, logout }),
    [user, login, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
