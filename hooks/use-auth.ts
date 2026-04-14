import * as Auth from "@/lib/_core/auth";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = {
  autoFetch?: boolean;
};

const LOCAL_DEVICE_USER: Auth.User = {
  id: 1,
  openId: "local-device-user",
  name: "Usuario local",
  email: null,
  loginMethod: "local",
  lastSignedIn: new Date(),
};

export function useAuth(options?: UseAuthOptions) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const cachedUser = await Auth.getUserInfo();
      const nextUser = cachedUser ?? { ...LOCAL_DEVICE_USER, lastSignedIn: new Date() };
      setUser(nextUser);
      await Auth.setUserInfo(nextUser);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch user");
      setError(error);
      setUser({ ...LOCAL_DEVICE_USER, lastSignedIn: new Date() });
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const nextUser = { ...LOCAL_DEVICE_USER, lastSignedIn: new Date() };
    await Auth.removeSessionToken();
    await Auth.setUserInfo(nextUser);
    setUser(nextUser);
    setError(null);
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  useEffect(() => {
    if (autoFetch) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [autoFetch, fetchUser]);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    refresh: fetchUser,
    logout,
  };
}
