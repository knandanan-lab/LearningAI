import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = signed out

  const refresh = useCallback(async () => {
    if (!getToken()) return setUser(false);
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setToken(null);
      setUser(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const [signedOut, setSignedOut] = useState(false);
  const signIn = ({ token, user: u }) => {
    setToken(token);
    setSignedOut(false);
    setUser(u);
  };
  const signOut = () => {
    setToken(null);
    setSignedOut(true);
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, signIn, signOut, refresh, signedOut }}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export const profileComplete = (u) => Boolean(u && u.country && u.work_function && u.ai_experience);
