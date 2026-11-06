import {
  Link,
  Outlet,
  useNavigate,
} from "react-router-dom";

import { MessageCircle } from "lucide-react";

import Sidebar from "../components/Sidebar";

import {
  useAdminAuth,
} from "../context/AdminAuthContext";

import NotificationBell from "../components/NotificationBell";

import {
  useInternalUnreadCount,
} from "../hooks/useInternalUnreadCount";

export default function AdminLayout() {
  const { logout } = useAdminAuth();
  const navigate = useNavigate();

  const { data: unreadCount = 0 } =
    useInternalUnreadCount();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />

      <section className="min-w-0 flex-1">
        {/* Admin Header */}
        <header className="flex h-[76px] items-center justify-between gap-3 border-b border-[#e2e7f0] bg-white px-5 dark:border-zinc-800 dark:bg-zinc-950 md:px-9">
          {/* Company Name */}
          <Link
            to="/admin"
            className="shrink-0 text-[1.2rem] font-extrabold text-[#172033] dark:text-white"
          >
            Company{" "}
            <span className="text-[#3155d9]">
              Connect
            </span>
          </Link>

          {/* Right Side */}
          <div className="ml-auto flex shrink-0 items-center justify-end gap-3 text-sm md:gap-4">
            {/* Existing Notification Bell */}
            <NotificationBell />

            {/* Internal Messaging */}
            <button
              type="button"
              onClick={() =>
                navigate("/admin/team-messages")
              }
              className="relative rounded-lg p-2 text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-zinc-800"
              title="Team Messages"
              aria-label={`Team Messages, ${unreadCount} unread`}
            >
              <MessageCircle size={21} />

              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold leading-5 text-white">
                  {unreadCount > 99
                    ? "99+"
                    : unreadCount}
                </span>
              )}
            </button>

            {/* Admin Portal Label */}
            <span className="hidden whitespace-nowrap text-[#6d7890] dark:text-gray-200 sm:inline">
              Admin Portal
            </span>

            {/* Logout Button */}
            <button
              type="button"
              className="shrink-0 rounded-lg border border-[#3155d9] bg-white px-3 py-2 text-[#3155d9] transition hover:bg-[#3155d9] hover:text-white dark:bg-zinc-900 dark:text-indigo-400 dark:hover:bg-[#3155d9] dark:hover:text-white"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </header>

        {/* Admin Page Content */}
        <div className="min-h-[calc(100vh-76px)] bg-white p-5 text-gray-900 dark:bg-black dark:text-white md:p-9">
          <Outlet />
        </div>
      </section>
    </div>
  );
}