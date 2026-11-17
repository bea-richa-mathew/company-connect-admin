
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  fetchAdminSession,
  loginAdmin,
  logoutAdmin,
} from "../api/apiServices";

const ADMIN_TOKEN_KEY = "company_portal_admin_token";

interface AdminAuthContextValue {
  isAuthenticated: boolean;
  token: string | null;
  loading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext =
  createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(ADMIN_TOKEN_KEY)
  );

  const [isAuthenticated, setIsAuthenticated] =
    useState(false);

  const [loading, setLoading] = useState(true);

  // Verify existing admin session
  useEffect(() => {
    let mounted = true;

    const verifySession = async () => {
      try {
        const savedToken = localStorage.getItem(
          ADMIN_TOKEN_KEY
        );

        if (!savedToken) {
          if (mounted) {
            setToken(null);
            setIsAuthenticated(false);
          }
          return;
        }

        const body = await fetchAdminSession();

        const user =
          body.user ?? body.data?.user;

        if (mounted) {
          if (user?.role === "admin") {
            setToken(savedToken);
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem(ADMIN_TOKEN_KEY);
            setToken(null);
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.error(
          "Admin session verification failed:",
          error
        );

        if (mounted) {
          localStorage.removeItem(ADMIN_TOKEN_KEY);
          setToken(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void verifySession();

    return () => {
      mounted = false;
    };
  }, []);

  // Admin login
  const login = async (
    email: string,
    password: string
  ): Promise<void> => {
    const body = await loginAdmin(email, password);

    const user =
      body.user ?? body.data?.user;

    if (user?.role !== "admin") {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      setToken(null);
      setIsAuthenticated(false);

      throw new Error(
        "This account does not have admin access."
      );
    }

    const savedToken = localStorage.getItem(
      ADMIN_TOKEN_KEY
    );

    if (!savedToken) {
      throw new Error(
        "Admin login token was not saved."
      );
    }

    setToken(savedToken);
    setIsAuthenticated(true);
  };

  // Admin logout
  const logout = () => {
    setIsAuthenticated(false);
    setToken(null);

    void logoutAdmin().catch((error) => {
      console.error(
        "Unable to complete admin logout:",
        error
      );
    });

    localStorage.removeItem(ADMIN_TOKEN_KEY);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        isAuthenticated,
        token,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error(
      "useAdminAuth must be used inside AdminAuthProvider"
    );
  }

  return context;
}
