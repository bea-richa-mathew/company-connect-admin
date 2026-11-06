
import { useMemo, useState, type FormEvent } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  Search,
} from "lucide-react";

import axios from "axios";
import { toast } from "react-toastify";

import {
  useAnnouncementsQuery,
} from "../hooks/queryHooks";

import {
  useSaveAnnouncementMutation,
  useDeleteAnnouncementMutation,
} from "../hooks/mutationHooks";

import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";

import type { Announcement } from "../types";

function getError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      (error.response
        ? `Request failed: ${error.response.status}`
        : "Cannot connect to the backend. Check that the server is running.")
    );
  }

  return error instanceof Error
    ? error.message
    : "Something went wrong.";
}

const fieldClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-[#343846] dark:bg-[#0c0e14] dark:text-white dark:placeholder:text-gray-500";

const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:bg-[#14161e] dark:text-gray-200 dark:hover:bg-gray-800";

export default function Announcements() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] =
    useState<Announcement | null>(null);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const announcementsQuery = useAnnouncementsQuery();

  const saveMutation = useSaveAnnouncementMutation({
    onSuccess: (_data, variables) => {
      toast.success(
        variables.id
          ? "Announcement updated successfully!"
          : "Announcement published successfully!"
      );

      setShowForm(false);
      setEditing(null);
      setTitle("");
      setMessage("");
    },

    onError: (error) => {
      toast.error(getError(error));
    },
  });

  const deleteMutation = useDeleteAnnouncementMutation({
    onSuccess: () => {
      toast.success("Announcement deleted successfully!");
    },

    onError: (error) => {
      toast.error(getError(error));
    },
  });

  const announcements = announcementsQuery.data ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return announcements;

    return announcements.filter((announcement) => {
      return [
        announcement.title,
        announcement.message,
        announcement.createdBy?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [announcements, search]);

  function resetForm() {
    setShowForm(false);
    setEditing(null);
    setTitle("");
    setMessage("");
    saveMutation.reset();
  }

  function openCreate() {
    setEditing(null);
    setTitle("");
    setMessage("");
    setShowForm(true);
  }

  function openEdit(announcement: Announcement) {
    setEditing(announcement);
    setTitle(announcement.title);
    setMessage(announcement.message);
    setShowForm(true);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      toast.warning("Please enter an announcement title.");
      return;
    }

    if (!message.trim()) {
      toast.warning("Please enter the announcement message.");
      return;
    }

    saveMutation.mutate({
      id: editing?._id,
      title: title.trim(),
      message: message.trim(),
    });
  }

  function removeAnnouncement(announcement: Announcement) {
    if (
      !window.confirm(
        `Delete the announcement "${announcement.title}"?`
      )
    ) {
      return;
    }

    deleteMutation.mutate(announcement._id);
  }

  const columns = [
    {
      key: "title",
      header: "Announcement",
      render: (announcement: Announcement) => (
        <div className="max-w-sm">
          <p className="font-semibold text-gray-900 dark:text-white">
            {announcement.title}
          </p>

          <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
            {announcement.message}
          </p>
        </div>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (announcement: Announcement) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {announcement.date || "—"}
        </span>
      ),
    },
    {
      key: "createdBy",
      header: "Created By",
      render: (announcement: Announcement) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {announcement.createdBy?.name || "Admin"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (announcement: Announcement) => (
        <StatusBadge
          value={announcement.active ? "Active" : "Inactive"}
        />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (announcement: Announcement) => (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openEdit(announcement)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-gray-700 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
          >
            <Pencil size={14} />
            Edit
          </button>

          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => removeAnnouncement(announcement)}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Announcements
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Create, publish and manage company announcements.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void announcementsQuery.refetch()}
            disabled={announcementsQuery.isFetching}
            className={secondaryButton}
          >
            <RefreshCw
              size={16}
              className={
                announcementsQuery.isFetching
                  ? "animate-spin"
                  : ""
              }
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            <Plus size={17} />
            Add Announcement
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Total Announcements", announcements.length],
          [
            "Active",
            announcements.filter((item) => item.active).length,
          ],
          [
            "Inactive",
            announcements.filter((item) => !item.active).length,
          ],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-[#252936] dark:bg-[#101218]"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {label}
            </p>

            <h2 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {value}
            </h2>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search announcements..."
          className={`${fieldClass} pl-10`}
        />
      </div>

      {/* Error */}
      {announcementsQuery.isError && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          Failed to load announcements:{" "}
          {getError(announcementsQuery.error)}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#252936] dark:bg-[#101218] sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            All Announcements
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {filtered.length} announcement(s) found
          </p>
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          loading={announcementsQuery.isLoading}
          emptyMessage="No announcements found."
        />
      </div>

      {/* Create / Edit Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4"
          onClick={resetForm}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={
              editing ? "Edit announcement" : "Add announcement"
            }
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 text-gray-900 shadow-2xl dark:bg-[#14161e] dark:text-white"
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">
                  {editing
                    ? "Edit Announcement"
                    : "Create Announcement"}
                </h2>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Share important information with employees.
                </p>
              </div>

              <button
                type="button"
                aria-label="Close form"
                onClick={resetForm}
                className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-5">
              <div>
                <label
                  htmlFor="announcement-title"
                  className="mb-2 block text-sm font-semibold"
                >
                  Title
                </label>

                <input
                  id="announcement-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Enter announcement title"
                  required
                  className={fieldClass}
                />
              </div>

              <div>
                <label
                  htmlFor="announcement-message"
                  className="mb-2 block text-sm font-semibold"
                >
                  Message
                </label>

                <textarea
                  id="announcement-message"
                  rows={6}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Write your announcement..."
                  required
                  className={fieldClass}
                />
              </div>

              {saveMutation.isError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {getError(saveMutation.error)}
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">
                <button
                  type="button"
                  onClick={resetForm}
                  className={secondaryButton}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {saveMutation.isPending
                    ? "Saving..."
                    : editing
                      ? "Update Announcement"
                      : "Publish Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
