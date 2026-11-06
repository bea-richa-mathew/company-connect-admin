
import { useState } from "react";
import { Link, Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import NotificationBell from "./NotificationBell";

import { useAdminAuth } from "../context/AdminAuthContext";
import { useTheme } from "../context/ThemeContext";

export default function AdminLayout() {
  const { logout } = useAdminAuth();
  const { isDark, toggleTheme } = useTheme();

  const [menuOpen, setMenuOpen] = useState(
    () => window.innerWidth >= 768
  );

  const closeMenu = () => setMenuOpen(false);
  const openMenu = () => setMenuOpen(true);

  return (
    <div className="admin-layout flex min-h-screen w-full items-stretch bg-gray-50 text-gray-900 dark:bg-zinc-950 dark:text-gray-100">

      {/* Desktop sidebar: stretches with the page */}
      {menuOpen && (
        <aside className="hidden shrink-0 self-stretch md:block">
          <Sidebar />
        </aside>
      )}

      {/* Mobile sidebar: participates in page layout */}
      {menuOpen && (
        <aside className="flex min-h-screen w-[260px] max-w-[75vw] shrink-0 flex-col bg-[#172033] text-white md:hidden">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-5">
            <span className="text-lg font-extrabold">
              Admin Panel
            </span>

            <button
              type="button"
              onClick={closeMenu}
              className="rounded-lg p-2 text-gray-300 transition hover:bg-white/10 hover:text-white"
              aria-label="Close navigation menu"
            >
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 6l12 12M18 6L6 18"
                />
              </svg>
            </button>
          </div>

          <div className="flex-1">
            <Sidebar onItemClick={closeMenu} />
          </div>
        </aside>
      )}

      {/* Main content */}
      <section className="admin-main flex min-w-0 flex-1 flex-col">

        {/* Header */}
        <header className="admin-header sticky top-0 z-30 flex min-h-[76px] items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:px-6 md:px-8">

          {/* Left side: Menu and Company Name */}
          <div className="flex min-w-0 items-center gap-3">

            {/* Hamburger menu */}
            <button
              type="button"
              onClick={menuOpen ? closeMenu : openMenu}
              className="flex shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 p-2.5 text-indigo-700 transition hover:bg-indigo-600 hover:text-white dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-400 dark:hover:bg-cyan-400 dark:hover:text-black"
              aria-label={
                menuOpen
                  ? "Close navigation menu"
                  : "Open navigation menu"
              }
              aria-expanded={menuOpen}
            >
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                {menuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 6l12 12M18 6L6 18"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>

            {/* Company name */}
            <Link
              to="/admin"
              className="truncate text-base font-extrabold text-gray-900 dark:text-white sm:text-xl"
            >
              Pinnacle{" "}
              <span className="text-indigo-600 dark:text-cyan-400">
                Smart Technology
              </span>
            </Link>
          </div>

          {/* Right side: Notification, Admin Portal, Theme, Logout */}
          <div className="ml-auto flex shrink-0 items-center justify-end gap-2 sm:gap-4">

            {/* Notification Bell */}
            <NotificationBell />

            {/* Admin Portal Label */}
            <span className="hidden whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 lg:inline">
              Admin Portal
            </span>

            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-600 hover:text-white dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-400 dark:hover:bg-cyan-400 dark:hover:text-black"
              aria-label={
                isDark
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
            >
              <span aria-hidden="true">
                {isDark ? "☀️" : "🌙"}
              </span>

              <span className="hidden sm:inline">
                {isDark ? "Light Mode" : "Dark Mode"}
              </span>
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={logout}
              className="shrink-0 rounded-xl border border-indigo-600 px-3 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-600 hover:text-white dark:border-cyan-400 dark:text-cyan-400 dark:hover:bg-cyan-400 dark:hover:text-black"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="admin-content min-h-[calc(100vh-76px)] flex-1 bg-gray-50 p-4 text-gray-900 dark:bg-zinc-950 dark:text-gray-100 sm:p-5 md:p-8">
          <Outlet />
        </main>
      </section>
    </div>
  );
}
