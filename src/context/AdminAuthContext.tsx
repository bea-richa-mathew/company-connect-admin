
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
  const [isAuthenticated, setIsAuthenticated] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let mounted = true;

    fetchAdminSession()
      .then((body) => {
        const user =
          body.user ?? body.data?.user;

        if (mounted) {
          setIsAuthenticated(
            user?.role === "admin"
          );
        }
      })
      .catch(() => {
        if (mounted) {
          setIsAuthenticated(false);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (
    email: string,
    password: string
  ) => {
    const body = await loginAdmin(
      email,
      password
    );

    const user =
      body.user ?? body.data?.user;

    if (user?.role !== "admin") {
      throw new Error(
        "This account does not have admin access."
      );
    }

    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);

    void logoutAdmin().catch((error) => {
      console.error(
        "Unable to clear the admin session cookie.",
        error
      );
    });
  };

  return (
    <AdminAuthContext.Provider
      value={{
        isAuthenticated,
        token: null,
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
  const context = useContext(
    AdminAuthContext
  );

  if (!context) {
    throw new Error(
      "useAdminAuth must be used inside AdminAuthProvider"
    );
  }

  return context;
}
