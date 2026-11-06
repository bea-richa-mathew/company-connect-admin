import { useQuery } from "@tanstack/react-query";

import {
  ShieldCheck,
  Mail,
  UserRound,
  CalendarDays,
  Fingerprint,
  UserCog,
} from "lucide-react";

import api from "../lib/api";
import StatusBadge from "../components/StatusBadge";
import type { AdminUser } from "../types";

export default function Profile() {
  const query = useQuery<{
    success: boolean;
    user: AdminUser;
  }>({
    queryKey: ["admin-profile"],
    queryFn: async () => {
      const response = await api.get("/auth/me");
      return response.data;
    },
  });

  const admin = query.data?.user;

  if (query.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500/20 border-t-indigo-500" />
      </div>
    );
  }

  if (query.isError || !admin) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-400">
        Unable to load administrator profile. Please refresh the page
        and try again.
      </div>
    );
  }

  const initial = admin.name?.trim().charAt(0).toUpperCase() || "A";

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10">
      {/* Page heading */}
      <div>
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-indigo-500">
          <UserCog size={15} />
          Account management
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          My Profile
        </h1>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          View your administrator account details and account status.
        </p>
      </div>

      {/* Profile banner */}
      <section className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-[#292d3a] dark:bg-[#12141c]">
        <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-r from-indigo-600/15 via-violet-500/10 to-transparent" />

        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-9">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 text-4xl font-bold text-white shadow-xl shadow-indigo-500/20 ring-4 ring-white dark:ring-[#12141c]">
            {initial}
          </div>

          <div className="min-w-0 flex-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-500">
              Administrator account
            </p>

            <h2 className="break-words text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
              {admin.name}
            </h2>

            <div className="mt-2 flex items-center gap-2 break-all text-sm text-gray-500 dark:text-gray-400">
              <Mail size={15} className="shrink-0" />
              {admin.email}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StatusBadge value="Active" />

              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <ShieldCheck size={14} />
                Administrator
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500 dark:border-[#303443] dark:bg-[#191c26] dark:text-gray-400 sm:self-center">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Account active
          </div>
        </div>
      </section>

      {/* Account information */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Account information
          </h3>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Your administrator details associated with this account.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <InfoCard
            icon={UserRound}
            label="Full name"
            value={admin.name || "Not available"}
            description="Administrator display name"
            iconStyle="bg-indigo-500/10 text-indigo-500"
          />

          <InfoCard
            icon={Mail}
            label="Email address"
            value={admin.email || "Not available"}
            description="Registered account email"
            iconStyle="bg-violet-500/10 text-violet-500"
          />

          <InfoCard
            icon={ShieldCheck}
            label="Account role"
            value="Administrator"
            description="Administrative access"
            iconStyle="bg-blue-500/10 text-blue-500"
          />

          <InfoCard
            icon={CalendarDays}
            label="Account status"
            value="Active"
            description="Current account status"
            iconStyle="bg-emerald-500/10 text-emerald-500"
          />
        </div>
      </section>

      {/* Security information */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-[#292d3a] dark:bg-[#12141c] sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
            <Fingerprint size={21} />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Account security
            </h3>

            <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
              Your account is used to access the administrative dashboard.
              Keep your login credentials private and sign out when using a
              shared computer.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  description,
  iconStyle,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  description: string;
  iconStyle: string;
}) {
  return (
    <div className="group rounded-2xl border border-gray-200 bg-white p-5 transition duration-200 hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-500/5 dark:border-[#292d3a] dark:bg-[#12141c] dark:hover:border-indigo-500/40 sm:p-6">
      <div className="flex items-start">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconStyle}`}
        >
          <Icon size={20} />
        </div>
      </div>

      <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label}
      </p>

      <p className="mt-2 break-words text-base font-bold text-gray-900 dark:text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
        {description}
      </p>
    </div>
  );
}
