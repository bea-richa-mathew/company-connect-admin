import {
  Navigate,
  Outlet
} from "react-router-dom";

import { useAdminAuth } from "../context/AdminAuthContext";

export default function ProtectedRoute() {
  const {
    isAuthenticated,
    loading
  } = useAdminAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-admin-bg text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-admin-border border-t-admin-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return <Outlet />;
}