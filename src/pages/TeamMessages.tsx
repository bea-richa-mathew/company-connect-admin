
import { useEffect, useState } from "react";

import TeamChat from "../components/TeamChat";
import { useAdminAuth } from "../context/AdminAuthContext";
import { fetchAdminSession } from "../api/apiServices";

type AdminUser = {
  _id?: string;
  id?: string;
  name?: string;
  role?: string;
};

export default function TeamMessages() {
  const { isAuthenticated, loading } = useAdminAuth();

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      setCurrentUserId(null);
      setChecking(false);
      return;
    }

    let cancelled = false;

    async function loadAdminSession() {
      setChecking(true);
      setError("");

      try {
        const body = await fetchAdminSession();

        const user = (
          body.user ?? body.data?.user
        ) as AdminUser | undefined;

        if (!user || user.role !== "admin") {
          throw new Error(
            "Administrator session is unavailable."
          );
        }

        const id = user._id ?? user.id;

        if (!id) {
          throw new Error(
            "Administrator ID was not returned."
          );
        }

        if (!cancelled) {
          setCurrentUserId(String(id));
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setCurrentUserId(null);

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load administrator session."
          );
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    }

    void loadAdminSession();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loading]);

  if (loading || checking) {
    return (
      <div className="p-6 text-gray-600 dark:text-gray-300">
        Loading Team Messages...
      </div>
    );
  }

  if (!isAuthenticated || error || !currentUserId) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
      >
        {error || "Administrator authentication required."}
      </div>
    );
  }

  return (
    <TeamChat
      token={null}
      currentUserId={currentUserId}
      title="Team Messages"
    />
  );
}
