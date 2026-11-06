
import {
  useState,
  type FormEvent,
} from "react";

import {
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";

import { toast } from "react-toastify";
import { useAdminAuth } from "../context/AdminAuthContext";

export default function Login() {
  const { isAuthenticated, login } = useAdminAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    if (!email.trim() || !password.trim()) {
      toast.warning("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      await login(email.trim(), password);

      toast.success("Admin login successful!");

      const from = (
        location.state as
          | { from?: { pathname?: string } }
          | null
      )?.from?.pathname;

      navigate(
        from?.startsWith("/admin") ? from : "/admin",
        { replace: true }
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Login failed. Please try again.";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-50 px-5 text-gray-900 transition-colors duration-300 dark:bg-admin-bg dark:text-white">
      {/* Background decorations */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-500/20">
            <ShieldCheck size={30} />
          </div>

          <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-indigo-600 dark:text-indigo-400">
            Pinnacle Smart Technology
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Admin Portal
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Sign in to manage your company
          </p>
        </div>

        {/* Login card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-gray-200 bg-white p-7 shadow-xl shadow-gray-200/60 transition-colors duration-300 dark:border-admin-border dark:bg-admin-card dark:shadow-panel sm:p-8"
        >
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Welcome back
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enter your administrator credentials below.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
            >
              {error}
            </div>
          )}

          {/* Email */}
          <label className="mb-5 block">
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email address
            </span>

            <div className="relative">
              <Mail
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
              />

              <input
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-admin-border dark:bg-[#08090d] dark:text-white dark:placeholder:text-gray-600 dark:focus:border-indigo-500 dark:focus:bg-[#08090d]"
                placeholder="admin@company.com"
                required
              />
            </div>
          </label>

          {/* Password */}
          <label className="mb-7 block">
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </span>

            <div className="relative">
              <Lock
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
              />

              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-11 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-admin-border dark:bg-[#08090d] dark:text-white dark:placeholder:text-gray-600 dark:focus:border-indigo-500 dark:focus:bg-[#08090d]"
                placeholder="Enter your password"
                required
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword((previous) => !previous)
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-indigo-600 dark:text-gray-500 dark:hover:text-indigo-400"
              >
                {showPassword ? (
                  <EyeOff size={17} />
                ) : (
                  <Eye size={17} />
                )}
              </button>
            </div>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}

            {!loading && <ArrowRight size={17} />}
          </button>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-500">
            <ShieldCheck size={14} />
            Secure administrator access
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-600">
          Authorized administrators only
        </p>
      </div>
    </div>
  );
}
