
import { useMemo, useState } from "react";

import {
  Search,
  Mail,
  Inbox,
  MessageSquare,
  Eye,
  X,
  RefreshCw,
  CalendarDays,
  UserRound,
  AtSign,
  ArrowUpRight,
} from "lucide-react";

import {
  useContactMessagesQuery,
} from "../hooks/queryHooks";

import type {
  ContactMessage,
} from "../api/apiServices";

// Reusable styles
const cardClass =
  "rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-[#111318]";

const primaryText =
  "text-gray-950 dark:text-white";

const secondaryText =
  "text-gray-700 dark:text-gray-300";

const mutedText =
  "text-gray-600 dark:text-gray-400";

function formatDate(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatFullDate(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

export default function Messages() {
  const [search, setSearch] = useState("");

  const [selectedMessage, setSelectedMessage] =
    useState<ContactMessage | null>(null);

  const messagesQuery = useContactMessagesQuery();

  const messages = messagesQuery.data ?? [];

  // Search messages
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return messages;

    return messages.filter((msg) => {
      return [
        msg.name,
        msg.email,
        msg.message,
        msg.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [messages, search]);

  // Latest messages first
  const sortedMessages = useMemo(() => {
    return [...filtered].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );
  }, [filtered]);

  const totalMessages = messages.length;

  const today = new Date().toDateString();

  const todayMessages = messages.filter(
    (msg) =>
      new Date(msg.createdAt).toDateString() === today
  ).length;

  const uniqueSenders = new Set(
    messages.map((msg) => msg.email.toLowerCase())
  ).size;

  const stats = [
    {
      label: "Total Messages",
      value: totalMessages,
      icon: Inbox,
      iconClass:
        "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400",
    },
    {
      label: "Received Today",
      value: todayMessages,
      icon: MessageSquare,
      iconClass:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    },
    {
      label: "Unique Senders",
      value: uniqueSenders,
      icon: UserRound,
      iconClass:
        "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
    },
  ];

  return (
    <div className="space-y-7 pb-8">
      {/* Page Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Mail
              size={16}
              className="text-indigo-600 dark:text-indigo-400"
            />

            <span className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-400">
              Communication Center
            </span>
          </div>

          <h1
            className={`text-3xl font-extrabold tracking-tight ${primaryText}`}
          >
            Contact Messages
          </h1>

          <p className={`mt-2 text-sm ${secondaryText}`}>
            View and manage inquiries received through
            your company website.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void messagesQuery.refetch()}
          disabled={messagesQuery.isFetching}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:bg-[#191c24] dark:text-white dark:hover:bg-gray-800"
        >
          <RefreshCw
            size={17}
            className={
              messagesQuery.isFetching
                ? "animate-spin"
                : ""
            }
          />
          Refresh Messages
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`${cardClass} p-5 transition-shadow hover:shadow-md`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stat.iconClass}`}
              >
                <stat.icon size={23} />
              </div>

              <div>
                <p
                  className={`text-sm font-semibold ${secondaryText}`}
                >
                  {stat.label}
                </p>

                <h2
                  className={`mt-1 text-3xl font-extrabold ${primaryText}`}
                >
                  {stat.value}
                </h2>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Messages Section */}
      <section className={cardClass}>
        {/* Toolbar */}
        <div className="border-b border-gray-200 p-5 dark:border-gray-800 sm:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2
                className={`text-lg font-bold ${primaryText}`}
              >
                Inbox
              </h2>

              <p className={`mt-1 text-sm ${secondaryText}`}>
                {sortedMessages.length} messages found
              </p>
            </div>

            <div className="relative w-full md:max-w-sm">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search name, email, message..."
                className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-11 pr-4 text-sm font-medium text-gray-950 placeholder:text-gray-600 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-[#0b0d12] dark:text-white dark:placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {messagesQuery.isError && (
          <div className="m-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            Failed to load messages. Please check the
            backend connection and try refreshing.
          </div>
        )}

        {/* Loading */}
        {messagesQuery.isLoading ? (
          <div className="space-y-4 p-6">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
              />
            ))}
          </div>
        ) : sortedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
              <Inbox
                size={30}
                className="text-gray-600 dark:text-gray-400"
              />
            </div>

            <h3
              className={`text-lg font-bold ${primaryText}`}
            >
              No Messages Found
            </h3>

            <p className={`mt-2 text-sm ${secondaryText}`}>
              {search
                ? "Try searching with a different keyword."
                : "Incoming contact messages will appear here."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {sortedMessages.map((msg) => (
              <article
                key={msg._id}
                className="group p-5 transition-colors hover:bg-indigo-50/50 dark:hover:bg-white/[0.03] sm:p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {/* Avatar */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300">
                    {getInitials(msg.name)}
                  </div>

                  {/* Message Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3
                          className={`text-base font-bold ${primaryText}`}
                        >
                          {msg.name}
                        </h3>

                        <p
                          className={`mt-1 break-all text-sm ${secondaryText}`}
                        >
                          {msg.email}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-400">
                        <CalendarDays size={14} />
                        {formatDate(msg.createdAt)}
                      </div>
                    </div>

                    <p
                      className={`mt-4 line-clamp-2 whitespace-pre-wrap text-sm leading-7 ${primaryText}`}
                    >
                      {msg.message}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <span className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                        {msg.status || "Received"}
                      </span>

                      <button
                        type="button"
                        onClick={() => setSelectedMessage(msg)}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500"
                      >
                        <Eye size={15} />
                        View Message
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Message Details Modal */}
      {selectedMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4"
          onClick={() => setSelectedMessage(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Contact message details"
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 text-gray-950 shadow-2xl dark:border-gray-700 dark:bg-[#151820] dark:text-white sm:p-7"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-700 dark:text-indigo-400">
                  Message Details
                </p>

                <h2 className="mt-2 text-2xl font-extrabold text-gray-950 dark:text-white">
                  Contact Inquiry
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                aria-label="Close message details"
                className="rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800"
              >
                <X size={21} />
              </button>
            </div>

            {/* Sender Details */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-[#0c0e14]">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <UserRound size={16} />
                  Sender Name
                </div>

                <p className="mt-2 font-bold text-gray-950 dark:text-white">
                  {selectedMessage.name}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-[#0c0e14]">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <AtSign size={16} />
                  Email Address
                </div>

                <p className="mt-2 break-all font-bold text-gray-950 dark:text-white">
                  {selectedMessage.email}
                </p>
              </div>
            </div>

            {/* Date */}
            <div className="mt-5 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <CalendarDays size={16} />
              Received:{" "}
              {formatFullDate(selectedMessage.createdAt)}
            </div>

            {/* Full Message */}
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-800 dark:text-gray-200">
                Message
              </h3>

              <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-[#0c0e14]">
                <p className="whitespace-pre-wrap break-words text-sm leading-8 text-gray-950 dark:text-gray-100">
                  {selectedMessage.message}
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-100 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
              >
                Close
              </button>

              <a
                href={`mailto:${selectedMessage.email}`}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                <Mail size={17} />
                Reply via Email
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
