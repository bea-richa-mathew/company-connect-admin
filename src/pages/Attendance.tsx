
import { useMemo, useState } from "react";

import {
  Search,
  RefreshCw,
} from "lucide-react";

import {
  useAttendanceQuery,
} from "../hooks/queryHooks";

import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";

import type {
  Attendance as AttendanceRecord,
} from "../types";

export default function Attendance() {
  const [search, setSearch] = useState("");

  const query = useAttendanceQuery();

  const records = query.data ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return records.filter((record) => {
      const name = record.employee?.name ?? "";
      const employeeId =
        record.employee?.employeeId ?? "";
      const department =
        record.employee?.department ?? "";
      const date = String(record.date ?? "");

      return (
        name.toLowerCase().includes(term) ||
        employeeId.toLowerCase().includes(term) ||
        department.toLowerCase().includes(term) ||
        date.includes(term)
      );
    });
  }, [records, search]);

  function formatDate(value?: string) {
    if (!value) return "—";

    const date = new Date(
      `${value.slice(0, 10)}T00:00:00`
    );

    return Number.isNaN(date.getTime())
      ? "—"
      : date.toLocaleDateString();
  }

  function formatTime(
    value?: string | Date | null
  ) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "—"
      : date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
  }

  const columns = [
    {
      key: "employee",
      header: "Employee",
      render: (record: AttendanceRecord) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            {record.employee?.name ?? "Unknown employee"}
          </p>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            {record.employee?.employeeId ??
              "No employee ID"}
          </p>
        </div>
      ),
    },
    {
      key: "department",
      header: "Department",
      render: (record: AttendanceRecord) => (
        <span className="text-gray-600 dark:text-gray-300">
          {record.employee?.department ?? "—"}
        </span>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (record: AttendanceRecord) => (
        <span className="text-gray-700 dark:text-gray-300">
          {formatDate(record.date)}
        </span>
      ),
    },
    {
      key: "checkIn",
      header: "Check In",
      render: (record: AttendanceRecord) => (
        <span className="text-gray-700 dark:text-gray-300">
          {formatTime(record.checkIn)}
        </span>
      ),
    },
    {
      key: "checkOut",
      header: "Check Out",
      render: (record: AttendanceRecord) => (
        <span className="text-gray-700 dark:text-gray-300">
          {formatTime(record.checkOut)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (record: AttendanceRecord) => (
        <StatusBadge value={record.status} />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Attendance
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View employee attendance records and working times.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <RefreshCw
            size={16}
            className={
              query.isFetching ? "animate-spin" : ""
            }
          />
          Refresh
        </button>
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
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search employee, ID, department or date..."
          className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-[#101218] dark:text-white"
        />
      </div>

      {/* Error */}
      {query.isError && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          Failed to load attendance records. Check your
          connection and backend route, then select Refresh.
        </div>
      )}

      {/* Attendance Table */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-[#252936] dark:bg-[#101218] sm:p-6">
        <div className="mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Attendance Records
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {query.isLoading
              ? "Loading records..."
              : `${filtered.length} record(s) found`}
          </p>
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          loading={query.isLoading}
          emptyMessage="No attendance records found."
        />
      </div>
    </div>
  );
}
