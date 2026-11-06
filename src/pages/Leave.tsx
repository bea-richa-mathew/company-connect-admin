
import { Mail } from "lucide-react";
import { toast } from "react-toastify";

import {
  useLeavesQuery,
} from "../hooks/queryHooks";

import {
  useReviewLeaveMutation,
} from "../hooks/mutationHooks";

import type {
  AdminLeave,
} from "../api/apiServices";

type EmployeeInfo = {
  _id?: string;
  name?: string;
  email?: string;
  employeeId?: string;
};

function getEmployeeName(
  employee?: EmployeeInfo | string | null
) {
  if (!employee) return "Unknown employee";

  if (typeof employee === "string") {
    return employee;
  }

  return (
    employee.name ||
    employee.email ||
    "Unknown employee"
  );
}

function getEmployeeIdentifier(
  employee?: EmployeeInfo | string | null
) {
  if (!employee || typeof employee === "string") {
    return "";
  }

  return employee.employeeId || employee.email || "";
}

function getEmployeeEmail(
  employee?: EmployeeInfo | string | null
) {
  if (!employee || typeof employee === "string") {
    return "";
  }

  return employee.email?.trim() || "";
}

function getStatusClass(status: string) {
  switch (status) {
    case "Approved":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";

    case "Rejected":
      return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";

    default:
      return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
  }
}

function formatDate(value?: string) {
  if (!value) return "N/A";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "N/A"
    : date.toLocaleDateString();
}

function sendLeaveEmail(leave: AdminLeave) {
  const email = getEmployeeEmail(leave.employee);

  if (!email) {
    toast.warning(
      "Employee email address is not available."
    );
    return;
  }

  const employeeName = getEmployeeName(
    leave.employee
  );

  const leaveType =
    leave.leaveType || leave.type || "Leave";

  const subject =
    `Leave Request Update - ${leaveType}`;

  let statusMessage = "";

  switch (leave.status) {
    case "Approved":
      statusMessage =
        "Your leave request has been approved. Please coordinate with your team regarding any pending responsibilities.";
      break;

    case "Rejected":
      statusMessage =
        "After reviewing your leave request, we regret to inform you that it has not been approved. Please contact the administration team if you need further clarification.";
      break;

    default:
      statusMessage =
        "Your leave request is currently pending review. We will notify you once a decision has been made.";
  }

  const body = `Dear ${employeeName},

I hope you are doing well.

This email is regarding your leave request.

Leave Type: ${leaveType}
Start Date: ${formatDate(leave.startDate)}
End Date: ${formatDate(leave.endDate)}
Current Status: ${leave.status}

${statusMessage}

${
  leave.adminComment
    ? `Admin Comments: ${leave.adminComment}\n\n`
    : ""
}Best regards,
HR & Administration Team
Pinnacle Smart Technologies`;

  const mailtoLink =
    `mailto:${email}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;

  window.location.href = mailtoLink;
}

export default function Leave() {
  const leavesQuery = useLeavesQuery();

  const reviewMutation = useReviewLeaveMutation();

  const leaves: AdminLeave[] =
    leavesQuery.data ?? [];

  const pendingCount = leaves.filter(
    (leave) => leave.status === "Pending"
  ).length;

  function reviewRequest(
    id: string,
    status: "Approved" | "Rejected"
  ) {
    const confirmed = window.confirm(
      `Are you sure you want to ${
        status === "Approved" ? "approve" : "reject"
      } this leave request?`
    );

    if (!confirmed) return;

    reviewMutation.mutate({ id, status });
  }

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      {/* Heading */}
      <div>
        <p className="mb-2 text-xs font-extrabold tracking-[.13em] text-indigo-700 dark:text-indigo-400">
          EMPLOYEE MANAGEMENT
        </p>

        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          Leave Management
        </h1>

        <p className="mt-2 text-sm text-slate-700 dark:text-slate-400">
          Review employee leave requests, manage approvals,
          and contact employees by email.
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-400">
            Total Requests
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            {leaves.length}
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Pending Requests
          </p>

          <p className="mt-2 text-3xl font-bold text-amber-900 dark:text-amber-200">
            {pendingCount}
          </p>
        </div>
      </div>

      {/* Mutation Error */}
      {reviewMutation.isError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {reviewMutation.error instanceof Error
            ? reviewMutation.error.message
            : "Failed to update the leave request."}
        </div>
      )}

      {/* Fetch Error */}
      {leavesQuery.isError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {leavesQuery.error instanceof Error
            ? leavesQuery.error.message
            : "Failed to load leave requests."}

          <button
            type="button"
            onClick={() => void leavesQuery.refetch()}
            className="ml-3 font-bold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Leave Table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Leave Requests
          </h2>

          <button
            type="button"
            onClick={() => void leavesQuery.refetch()}
            disabled={leavesQuery.isFetching}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {leavesQuery.isFetching
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>

        {leavesQuery.isLoading ? (
          <p className="p-6 text-sm text-slate-700 dark:text-slate-400">
            Loading leave requests...
          </p>
        ) : leaves.length === 0 ? (
          <p className="p-6 text-sm text-slate-700 dark:text-slate-400">
            No leave requests found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800/80">
                <tr>
                  {[
                    "Employee",
                    "Leave Type",
                    "Period",
                    "Reason",
                    "Status",
                    "Action",
                    "Email",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-200"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {leaves.map((leave) => (
                  <tr
                    key={leave._id}
                    className="border-t border-slate-200 dark:border-slate-800"
                  >
                    {/* Employee */}
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {getEmployeeName(leave.employee)}
                      </p>

                      <p className="mt-1 text-xs text-slate-700 dark:text-slate-400">
                        {getEmployeeIdentifier(leave.employee)}
                      </p>
                    </td>

                    {/* Leave Type */}
                    <td className="px-5 py-4 text-slate-900 dark:text-slate-300">
                      {leave.leaveType ||
                        leave.type ||
                        "—"}
                    </td>

                    {/* Period */}
                    <td className="px-5 py-4 text-slate-900 dark:text-slate-300">
                      <p>
                        From: {formatDate(leave.startDate)}
                      </p>
                      <p className="mt-1">
                        To: {formatDate(leave.endDate)}
                      </p>
                    </td>

                    {/* Reason */}
                    <td className="max-w-xs px-5 py-4 text-slate-900 dark:text-slate-300">
                      <p className="whitespace-pre-wrap">
                        {leave.reason || "—"}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                          leave.status
                        )}`}
                      >
                        {leave.status}
                      </span>

                      {leave.adminComment && (
                        <p className="mt-2 max-w-xs text-xs text-slate-700 dark:text-slate-400">
                          {leave.adminComment}
                        </p>
                      )}
                    </td>

                    {/* Approval Actions */}
                    <td className="px-5 py-4">
                      {leave.status === "Pending" ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={reviewMutation.isPending}
                            onClick={() =>
                              reviewRequest(
                                leave._id,
                                "Approved"
                              )
                            }
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                          >
                            Approve
                          </button>

                          <button
                            type="button"
                            disabled={reviewMutation.isPending}
                            onClick={() =>
                              reviewRequest(
                                leave._id,
                                "Rejected"
                              )
                            }
                            className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-400">
                          Reviewed
                        </span>
                      )}
                    </td>

                    {/* New Email Action */}
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => sendLeaveEmail(leave)}
                        disabled={!getEmployeeEmail(leave.employee)}
                        className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                      >
                        <Mail size={15} />
                        Send Email
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
