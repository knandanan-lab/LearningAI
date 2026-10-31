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
    if (window.location.hash?.includes("session_id=")) return setUser(false);
    refresh();
  }, [refresh]);

  const signIn = ({ token, user: u }) => {
    setToken(token);
    setUser(u);
  };
  const signOut = () => {
    setToken(null);
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, signIn, signOut, refresh }}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export const profileComplete = (u) => Boolean(u && u.country && u.work_function && u.ai_experience);
