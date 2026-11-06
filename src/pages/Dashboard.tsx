
import {
  useDashboardQuery,
  useStatsQuery,
} from "../hooks/queryHooks";

import {
  Users,
  BriefcaseBusiness,
  FileText,
  CalendarClock,
  Clock3,
  UserCheck,
  CheckCircle2,
  ListTodo,
  Mail,
  Building2,
  RefreshCw,
} from "lucide-react";

import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";

import type {
  DashboardStats,
  GroupCount,
} from "../api/apiServices";

const panelClass =
  "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-admin-border dark:bg-admin-card sm:p-6";

const secondaryPanelClass =
  "rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-admin-border dark:bg-admin-bg";

const headingClass =
  "text-base font-semibold text-gray-900 dark:text-white";

const mutedClass =
  "text-sm text-gray-500 dark:text-gray-400";

function getCount(
  items: GroupCount[] | undefined,
  ...statuses: string[]
): number {
  if (!items) return 0;

  const normalized = statuses.map((status) =>
    status.toLowerCase()
  );

  return items.reduce((total, item) => {
    const status = String(item._id ?? "").toLowerCase();

    return normalized.includes(status)
      ? total + item.count
      : total;
  }, 0);
}

function GroupSummary({
  title,
  items,
}: {
  title: string;
  items: GroupCount[];
}) {
  const total = items.reduce(
    (sum, item) => sum + item.count,
    0
  );

  return (
    <section className={panelClass}>
      <h2 className={headingClass}>{title}</h2>

      {items.length === 0 ? (
        <p className={`mt-4 ${mutedClass}`}>
          No data available.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {items.map((item, index) => {
            const percentage = total
              ? Math.round((item.count / total) * 100)
              : 0;

            return (
              <div key={`${item._id ?? "Other"}-${index}`}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {item._id || "Other"}
                  </span>

                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {item.count}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-indigo-600 dark:bg-cyan-400"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function Dashboard() {
  const dashboardQuery = useDashboardQuery();
  const statsQuery = useStatsQuery();

  const dashboard = dashboardQuery.data;
  const stats: DashboardStats | undefined =
    statsQuery.data;

  const loading =
    dashboardQuery.isPending || statsQuery.isPending;

  const error =
    dashboardQuery.isError || statsQuery.isError;

  const pendingApplications = getCount(
    stats?.applicationsByStatus,
    "Pending",
    "Applied"
  );

  const selectedApplications = getCount(
    stats?.applicationsByStatus,
    "Selected"
  );

  const approvedLeaves = getCount(
    stats?.leavesByStatus,
    "Approved"
  );

  const applicationStatuses =
    stats?.applicationsByStatus ?? [];

  const departmentStats =
    stats?.employeesByDepartment ?? [];

  const attendanceStats =
    stats?.attendanceByStatus ?? [];

  const leaveStats =
    stats?.leavesByStatus ?? [];

  async function refreshDashboard() {
    await Promise.all([
      dashboardQuery.refetch(),
      statsQuery.refetch(),
    ]);
  }

  const cards = [
    {
      label: "Total Employees",
      value: dashboard?.totalEmployees ?? 0,
      icon: Users,
    },
    {
      label: "Active Employees",
      value: dashboard?.activeEmployees ?? 0,
      icon: UserCheck,
    },
    {
      label: "Total Jobs",
      value: dashboard?.totalJobs ?? 0,
      icon: BriefcaseBusiness,
    },
    {
      label: "Open Jobs",
      value: dashboard?.openJobs ?? 0,
      icon: BriefcaseBusiness,
    },
    {
      label: "Applications",
      value: dashboard?.totalApplications ?? 0,
      icon: FileText,
    },
    {
      label: "Pending Leaves",
      value: dashboard?.pendingLeaves ?? 0,
      icon: CalendarClock,
    },
    {
      label: "Today's Attendance",
      value: dashboard?.todayAttendance ?? 0,
      icon: Clock3,
    },
    {
      label: "Pending Tasks",
      value: dashboard?.pendingTasks ?? 0,
      icon: ListTodo,
    },
    {
      label: "New Messages",
      value: dashboard?.newMessages ?? 0,
      icon: Mail,
    },
  ];

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Overview of company operations, employees,
            recruitment, and performance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refreshDashboard()}
          disabled={
            dashboardQuery.isFetching ||
            statsQuery.isFetching
          }
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:border-admin-border dark:text-gray-200 dark:hover:bg-white/10"
        >
          <RefreshCw
            size={16}
            className={
              dashboardQuery.isFetching ||
              statsQuery.isFetching
                ? "animate-spin"
                : ""
            }
          />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          Unable to load some dashboard data.
          Check your backend connection and refresh.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className={panelClass}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-cyan-400/10 dark:text-cyan-400">
                <card.icon size={22} />
              </div>

              <div>
                <p className={mutedClass}>
                  {card.label}
                </p>

                <h2 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
                  {loading ? "..." : card.value}
                </h2>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <div className={secondaryPanelClass}>
          <div className="flex items-center gap-3">
            <Clock3 className="text-amber-500" size={22} />
            <div>
              <p className={mutedClass}>
                Pending Applications
              </p>
              <h3 className="text-2xl font-bold">
                {pendingApplications}
              </h3>
            </div>
          </div>
        </div>

        <div className={secondaryPanelClass}>
          <div className="flex items-center gap-3">
            <CheckCircle2
              className="text-emerald-500"
              size={22}
            />
            <div>
              <p className={mutedClass}>
                Selected Applications
              </p>
              <h3 className="text-2xl font-bold">
                {selectedApplications}
              </h3>
            </div>
          </div>
        </div>

        <div className={secondaryPanelClass}>
          <div className="flex items-center gap-3">
            <UserCheck
              className="text-indigo-500"
              size={22}
            />
            <div>
              <p className={mutedClass}>
                Approved Leaves
              </p>
              <h3 className="text-2xl font-bold">
                {approvedLeaves}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <GroupSummary
          title="Application Pipeline"
          items={applicationStatuses}
        />

        <GroupSummary
          title="Employees by Department"
          items={departmentStats}
        />

        <GroupSummary
          title="Attendance Overview"
          items={attendanceStats}
        />

        <GroupSummary
          title="Leave Status Overview"
          items={leaveStats}
        />
      </div>

      <section className={panelClass}>
        <div className="flex items-center gap-3">
          <Building2
            size={20}
            className="text-indigo-500"
          />

          <h2 className={headingClass}>
            Recruitment Status
          </h2>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {applicationStatuses.length === 0 ? (
            <p className={mutedClass}>
              No recruitment statistics available.
            </p>
          ) : (
            applicationStatuses.map((item, index) => (
              <div
                key={`${item._id}-${index}`}
                className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 dark:border-admin-border"
              >
                <StatusBadge value={item._id || "Other"} />
                <span className="font-bold">
                  {item.count}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
