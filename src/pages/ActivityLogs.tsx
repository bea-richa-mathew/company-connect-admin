
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";

interface Activity {
  _id: string;
  actor?: {
    name: string;
    email: string;
    role: string;
  } | null;
  action: string;
  entityType: string;
  description: string;
  createdAt: string;
}

interface ActivityResponse {
  success: boolean;
  data: Activity[];
  page: number;
  pages: number;
  total: number;
}

export default function ActivityLogs() {
  const [page, setPage] = useState(1);

  const {
    data,
    isLoading,
    isError
  } = useQuery<ActivityResponse>({
    queryKey: ["activity-logs", page],
    queryFn: async () => {
      const response = await api.get(
        "/activity-logs",
        {
          params: {
            page,
            limit: 20
          }
        }
      );

      return response.data;
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Activity History
        </h1>

        <p className="text-sm text-gray-500">
          Login history and system activity
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="p-4">User</th>
              <th className="p-4">Action</th>
              <th className="p-4">Description</th>
              <th className="p-4">Date & Time</th>
            </tr>
          </thead>

          <tbody>
            {data?.data.map((log) => (
              <tr
                key={log._id}
                className="border-b border-gray-100 dark:border-gray-700"
              >
                <td className="p-4">
                  {log.actor?.name || "System"}
                </td>

                <td className="p-4">
                  {log.action.replaceAll("_", " ")}
                </td>

                <td className="p-4">
                  {log.description}
                </td>

                <td className="p-4">
                  {new Date(
                    log.createdAt
                  ).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {isLoading && (
          <p className="p-5">
            Loading activity...
          </p>
        )}

        {isError && (
          <p className="p-5 text-red-500">
            Failed to load activity logs.
          </p>
        )}

        {!isLoading &&
          !isError &&
          data?.data.length === 0 && (
            <p className="p-5 text-gray-500">
              No activity recorded yet.
            </p>
          )}
      </div>

      <div className="flex items-center justify-between">
        <button
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          className="rounded-lg border px-4 py-2 disabled:opacity-40"
        >
          Previous
        </button>

        <span className="text-sm">
          Page {page} of {data?.pages || 1}
        </span>

        <button
          disabled={
            page >= (data?.pages || 1)
          }
          onClick={() =>
            setPage(page + 1)
          }
          className="rounded-lg border px-4 py-2 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
