
import { useEffect } from "react";

import {
  RefreshCw,
  Users,
  CheckCircle2,
  FolderKanban,
  ClipboardList,
  Clock3,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

import {
  usePerformanceQuery,
} from "../hooks/queryHooks";

interface PerformanceItem {
  employee: {
    _id: string;
    name: string;
    email: string;
    employeeId?: string;
    department?: string;
    designation?: string;
  };

  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completionRate: number;

  totalProjects?: number;
  completedProjects?: number;
  approvedProjects?: number;
  inProgressProjects?: number;
  planningProjects?: number;
  onHoldProjects?: number;
  pendingReviewProjects?: number;
  projectCompletionRate?: number;

  totalWork?: number;
  completedWork?: number;
  overallPerformanceRate?: number;
}

function percentage(
  completed: number,
  total: number
) {
  return total > 0
    ? Math.round((completed / total) * 100)
    : 0;
}

function ProgressBar({
  value,
}: {
  value: number;
}) {
  const safeValue = Math.min(
    100,
    Math.max(0, value)
  );

  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-700">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-500 dark:bg-cyan-400"
          style={{
            width: `${safeValue}%`,
          }}
        />
      </div>

      <span className="text-sm font-semibold text-gray-900 dark:text-white">
        {safeValue}%
      </span>
    </div>
  );
}

export default function Performance() {
  const query = usePerformanceQuery();

  // Refresh performance while this page is open.
  useEffect(() => {
    const interval = window.setInterval(() => {
      void query.refetch();
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [query.refetch]);

  const performance =
    (query.data ?? []) as PerformanceItem[];

  const sum = (
    key: keyof PerformanceItem
  ): number =>
    performance.reduce((total, item) => {
      const value = item[key];

      return total +
        (typeof value === "number" ? value : 0);
    }, 0);

  // TASK STATISTICS

  const totalTasks = sum("totalTasks");
  const completedTasks = sum("completedTasks");
  const inProgressTasks = sum("inProgressTasks");
  const pendingTasks = sum("pendingTasks");
  const overdueTasks = sum("overdueTasks");

  const taskCompletionRate = percentage(
    completedTasks,
    totalTasks
  );

  // PROJECT STATISTICS

  const totalProjects = sum("totalProjects");
  const completedProjects = sum("completedProjects");
  const approvedProjects = sum("approvedProjects");
  const inProgressProjects = sum("inProgressProjects");
  const pendingReviewProjects =
    sum("pendingReviewProjects");

  const projectCompletionRate = percentage(
    completedProjects,
    totalProjects
  );

  // OVERALL PERFORMANCE

  const totalWork =
    totalTasks + totalProjects;

  const verifiedCompletedWork =
    completedTasks + approvedProjects;

  const overallRate = percentage(
    verifiedCompletedWork,
    totalWork
  );

  const summaryCards = [
    {
      label: "Employees",
      value: performance.length,
      icon: Users,
    },
    {
      label: "Total Tasks",
      value: totalTasks,
      icon: ClipboardList,
    },
    {
      label: "Completed Tasks",
      value: completedTasks,
      icon: CheckCircle2,
    },
    {
      label: "Total Projects",
      value: totalProjects,
      icon: FolderKanban,
    },
    {
      label: "Completed Projects",
      value: completedProjects,
      icon: CheckCircle2,
    },
    {
      label: "Approved Projects",
      value: approvedProjects,
      icon: CheckCircle2,
    },
    {
      label: "Pending Project Reviews",
      value: pendingReviewProjects,
      icon: Clock3,
    },
    {
      label: "Overall Performance",
      value: `${overallRate}%`,
      icon: TrendingUp,
    },
  ];

  if (query.isLoading) {
    return (
      <div className="flex min-h-[250px] items-center justify-center gap-3 text-gray-600 dark:text-gray-400">
        <RefreshCw
          size={20}
          className="animate-spin"
        />
        Loading employee performance...
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="space-y-4 rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/20">
        <p className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle size={18} />

          {query.error instanceof Error
            ? query.error.message
            : "Failed to load performance data."}
        </p>

        <button
          type="button"
          onClick={() => void query.refetch()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-7 text-gray-900 dark:text-white">
      {/* HEADER */}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            Employee Analytics
          </p>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Performance Dashboard
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Monitor employee tasks, project progress,
            approvals, and overall performance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-200 dark:hover:bg-zinc-800"
        >
          <RefreshCw
            size={16}
            className={
              query.isFetching
                ? "animate-spin"
                : ""
            }
          />

          Refresh
        </button>
      </div>

      {/* SUMMARY CARDS */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {card.label}
                </p>

                <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <Icon size={19} />
                </div>
              </div>

              <h2 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
                {card.value}
              </h2>
            </div>
          );
        })}
      </div>

      {/* TASK AND PROJECT PROGRESS */}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-bold">
            Task Performance
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Progress across assigned tasks.
          </p>

          <div className="mt-6 flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Completion Rate
            </span>

            <strong className="text-2xl text-indigo-600 dark:text-indigo-400">
              {taskCompletionRate}%
            </strong>
          </div>

          <div className="mt-3 h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-700">
            <div
              className="h-full rounded-full bg-indigo-600 dark:bg-indigo-400"
              style={{
                width: `${taskCompletionRate}%`,
              }}
            />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <p>Completed: {completedTasks}</p>
            <p>In Progress: {inProgressTasks}</p>
            <p>Pending: {pendingTasks}</p>
            <p>Overdue: {overdueTasks}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-bold">
            Project Performance
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Completion and review status of assigned projects.
          </p>

          <div className="mt-6 flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Completion Rate
            </span>

            <strong className="text-2xl text-indigo-600 dark:text-indigo-400">
              {projectCompletionRate}%
            </strong>
          </div>

          <div className="mt-3 h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-700">
            <div
              className="h-full rounded-full bg-indigo-600 dark:bg-indigo-400"
              style={{
                width: `${projectCompletionRate}%`,
              }}
            />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <p>Completed: {completedProjects}</p>
            <p>Approved: {approvedProjects}</p>
            <p>In Progress: {inProgressProjects}</p>
            <p>Pending Review: {pendingReviewProjects}</p>
          </div>
        </section>
      </div>

      {/* EMPLOYEE PERFORMANCE TABLE */}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-gray-200 p-5 dark:border-zinc-800">
          <h2 className="text-lg font-bold">
            Employee Performance Report
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Individual task and project performance.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-700 dark:bg-zinc-800/50 dark:text-gray-200">
              <tr>
                <th className="p-4">Employee</th>
                <th className="p-4">Tasks</th>
                <th className="p-4">Tasks Done</th>
                <th className="p-4">In Progress</th>
                <th className="p-4">Overdue</th>
                <th className="p-4">Task Rate</th>
                <th className="p-4">Projects</th>
                <th className="p-4">Projects Done</th>
                <th className="p-4">Approved</th>
                <th className="p-4">Pending Review</th>
                <th className="p-4">Overall</th>
              </tr>
            </thead>

            <tbody>
              {performance.map((item) => {
                const projectTotal =
                  item.totalProjects ?? 0;

                const projectCompleted =
                  item.completedProjects ?? 0;

                const projectApproved =
                  item.approvedProjects ?? 0;

                const overall =
                  item.overallPerformanceRate ??
                  percentage(
                    item.completedTasks + projectApproved,
                    item.totalTasks + projectTotal
                  );

                return (
                  <tr
                    key={item.employee._id}
                    className="border-t border-gray-100 transition-colors hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40"
                  >
                    <td className="p-4">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {item.employee.name}
                      </p>

                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {item.employee.department || "—"}
                      </p>
                    </td>

                    <td className="p-4">
                      {item.totalTasks}
                    </td>

                    <td className="p-4">
                      {item.completedTasks}
                    </td>

                    <td className="p-4">
                      {item.inProgressTasks}
                    </td>

                    <td className="p-4">
                      {item.overdueTasks}
                    </td>

                    <td className="p-4">
                      <ProgressBar
                        value={item.completionRate}
                      />
                    </td>

                    <td className="p-4">
                      {projectTotal}
                    </td>

                    <td className="p-4">
                      {projectCompleted}
                    </td>

                    <td className="p-4">
                      {projectApproved}
                    </td>

                    <td className="p-4">
                      {item.pendingReviewProjects ?? 0}
                    </td>

                    <td className="p-4">
                      <ProgressBar value={overall} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {performance.length === 0 && (
          <p className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No employee performance data found.
          </p>
        )}
      </section>

    </div>
  );
}
