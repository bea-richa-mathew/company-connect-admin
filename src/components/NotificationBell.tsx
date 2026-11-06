
import { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationResponse {
  success: boolean;
  data: Notification[];
  unreadCount: number;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    data,
    isLoading,
    isError
  } = useQuery<NotificationResponse>({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const response = await api.get(
        "/notifications"
      );

      return response.data;
    },
    refetchInterval: 10000
  });

  const readMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(
        `/notifications/${id}/read`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-notifications"]
      });
    }
  });

  const readAllMutation = useMutation({
    mutationFn: async () => {
      await api.patch(
        "/notifications/read-all"
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-notifications"]
      });
    }
  });

  const notifications = data?.data || [];
  const unreadCount = data?.unreadCount || 0;

  async function openNotification(
    notification: Notification
  ) {
    if (!notification.isRead) {
      try {
        await readMutation.mutateAsync(
          notification._id
        );
      } catch (error) {
        console.error(
          "Failed to mark notification as read:",
          error
        );
      }
    }

    setOpen(false);

    if (
      notification.link &&
      notification.link.startsWith("/") &&
      !notification.link.startsWith("//")
    ) {
      navigate(notification.link);
    }
  }

  return (
    <div className="relative flex shrink-0 items-center justify-center">

      {/* Visible Notification Bell */}
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#dce3ef] bg-[#f3f6ff] text-[#3155d9] shadow-sm transition hover:border-[#3155d9] hover:bg-[#e6edff] dark:border-zinc-700 dark:bg-zinc-800 dark:text-cyan-400"
        aria-label="Notifications"
        aria-expanded={open}
        title="Notifications"
      >
        <Bell size={21} strokeWidth={2.2} />

        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(90vw,360px)] overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-xl dark:border-gray-700 dark:bg-gray-900 dark:text-white">

          {/* Dropdown Header */}
          <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
            <h3 className="font-semibold">
              Notifications
            </h3>

            <button
              type="button"
              disabled={
                unreadCount === 0 ||
                readAllMutation.isPending
              }
              onClick={() =>
                readAllMutation.mutate()
              }
              className="flex items-center gap-1 text-xs text-blue-600 disabled:opacity-40 dark:text-cyan-400"
            >
              <CheckCheck size={15} />
              Mark all read
            </button>
          </div>

          {/* Notification Content */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <p className="p-5 text-center text-sm">
                Loading notifications...
              </p>
            ) : isError ? (
              <p className="p-5 text-center text-sm text-red-500">
                Unable to load notifications.
              </p>
            ) : notifications.length === 0 ? (
              <p className="p-5 text-center text-sm text-gray-500">
                No notifications yet.
              </p>
            ) : (
              notifications.map((notification) => (
                <button
                  type="button"
                  key={notification._id}
                  onClick={() =>
                    openNotification(notification)
                  }
                  className={`block w-full border-b border-gray-100 p-4 text-left transition hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-gray-800 ${
                    !notification.isRead
                      ? "bg-blue-50 dark:bg-blue-950/30"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">
                      {notification.title}
                    </p>

                    {!notification.isRead && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    )}
                  </div>

                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    {notification.message}
                  </p>

                  <p className="mt-2 text-xs text-gray-400">
                    {new Date(
                      notification.createdAt
                    ).toLocaleString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
