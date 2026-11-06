
import {
  useMemo,
  useState,
} from "react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  Search,
  ExternalLink,
  Mail,
  RefreshCw,
  Users,
  CalendarDays,
  CheckCircle2,
} from "lucide-react";

import { toast } from "react-toastify";

import api from "../lib/api";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";

import type { Application } from "../types";

const statuses = [
  "Applied",
  "Shortlisted",
  "Interview",
  "Selected",
  "Rejected",
] as const;

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function getEmailMessage(
  application: Application
) {
  const candidateName =
    application.applicantName || "Candidate";

  const position =
    application.job?.title || "the applied position";

  const status = application.status;

  const subject =
    `Application Update - ${position} | Pinnacle Smart Technologies`;

  let message = "";

  switch (status) {
    case "Shortlisted":
      message = `We are pleased to inform you that your application has been shortlisted for the position of ${position}.

Our recruitment team will contact you regarding the next steps in the selection process.`;
      break;

    case "Interview":
      message = `Your application for the position of ${position} has progressed to the interview stage.

We would like to discuss the next steps and interview arrangements with you. Please reply to this email to coordinate a suitable time.`;
      break;

    case "Selected":
      message = `Congratulations!

We are pleased to inform you that you have been selected for the position of ${position}.

Our HR team will contact you with further details regarding the next steps.`;
      break;

    case "Rejected":
      message = `Thank you for your interest in Pinnacle Smart Technologies and for taking the time to apply for the position of ${position}.

After careful consideration, we regret to inform you that we will not be proceeding with your application at this time.

We appreciate your interest and wish you success in your future opportunities.`;
      break;

    default:
      message = `Thank you for applying for the position of ${position} at Pinnacle Smart Technologies.

We have received your application, and our recruitment team is reviewing your details.

We will contact you if further information is required.`;
  }

  const body = `Dear ${candidateName},

${message}

Best regards,
Recruitment Team
Pinnacle Smart Technologies`;

  return {
    subject,
    body,
  };
}

function sendApplicationEmail(
  application: Application
) {
  const email = application.email?.trim();

  if (!email) {
    toast.warning(
      "Candidate email address is not available."
    );
    return;
  }

  const { subject, body } =
    getEmailMessage(application);

  const mailtoLink =
    `mailto:${email}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;

  window.location.href = mailtoLink;
}

export default function Applications() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");

  const applicationsQuery = useQuery<{
    success: boolean;
    data: Application[];
  }>({
    queryKey: ["applications"],
    queryFn: async () => {
      const response =
        await api.get("/applications");

      return response.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: Application["status"];
    }) => {
      return api.patch(
        `/applications/${id}`,
        { status }
      );
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["applications"],
      });

      toast.success(
        "Application status updated successfully."
      );
    },

    onError: () => {
      toast.error(
        "Failed to update application status."
      );
    },
  });

  const applications =
    applicationsQuery.data?.data ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return applications.filter(
      (application) =>
        (application.applicantName || "")
          .toLowerCase()
          .includes(term) ||
        (application.email || "")
          .toLowerCase()
          .includes(term) ||
        (application.job?.title || "")
          .toLowerCase()
          .includes(term)
    );
  }, [applications, search]);

  const shortlistedCount = applications.filter(
    (application) =>
      application.status === "Shortlisted"
  ).length;

  const interviewCount = applications.filter(
    (application) =>
      application.status === "Interview"
  ).length;

  const selectedCount = applications.filter(
    (application) =>
      application.status === "Selected"
  ).length;

  const columns = [
    {
      key: "candidate",
      header: "Candidate",
      render: (application: Application) => (
        <div>
          <p className="font-semibold text-gray-950 dark:text-white">
            {application.applicantName}
          </p>

          <p className="mt-1 text-xs text-gray-700 dark:text-gray-400">
            {application.email}
          </p>
        </div>
      ),
    },

    {
      key: "job",
      header: "Position",
      render: (application: Application) => (
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-200">
            {application.job?.title || "—"}
          </p>

          <p className="mt-1 text-xs text-gray-700 dark:text-gray-400">
            {application.job?.department || ""}
          </p>
        </div>
      ),
    },

    {
      key: "phone",
      header: "Phone",
      render: (application: Application) => (
        <span className="text-sm text-gray-900 dark:text-gray-300">
          {application.phone || "—"}
        </span>
      ),
    },

    {
      key: "date",
      header: "Applied",
      render: (application: Application) => (
        <span className="text-sm text-gray-900 dark:text-gray-300">
          {formatDate(application.createdAt)}
        </span>
      ),
    },

    {
      key: "status",
      header: "Status",
      render: (application: Application) => (
        <select
          value={application.status}
          disabled={updateMutation.isPending}
          onChange={(event) =>
            updateMutation.mutate({
              id: application._id,
              status:
                event.target
                  .value as Application["status"],
            })
          }
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-950 outline-none focus:border-indigo-500 disabled:opacity-50 dark:border-gray-700 dark:bg-[#111318] dark:text-white"
        >
          {statuses.map((status) => (
            <option
              key={status}
              value={status}
            >
              {status}
            </option>
          ))}
        </select>
      ),
    },

    {
      key: "resume",
      header: "Resume",
      render: (application: Application) =>
        application.resumeUrl ? (
          <a
            href={application.resumeUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            Open
            <ExternalLink size={14} />
          </a>
        ) : (
          <span className="text-gray-700 dark:text-gray-400">
            —
          </span>
        ),
    },

    {
      key: "badge",
      header: "Current",
      render: (application: Application) => (
        <StatusBadge value={application.status} />
      ),
    },

    {
      key: "email",
      header: "Email",
      render: (application: Application) => (
        <button
          type="button"
          onClick={() =>
            sendApplicationEmail(application)
          }
          disabled={!application.email}
          className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
        >
          <Mail size={15} />
          Send Email
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-gray-950 dark:text-white">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-400">
            Recruitment
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-950 dark:text-white">
            Applications
          </h1>

          <p className="mt-2 text-sm text-gray-700 dark:text-gray-400">
            Review candidates, update application stages,
            and communicate with applicants.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void applicationsQuery.refetch()
          }
          disabled={applicationsQuery.isFetching}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:bg-[#14161e] dark:text-white dark:hover:bg-gray-800"
        >
          <RefreshCw
            size={16}
            className={
              applicationsQuery.isFetching
                ? "animate-spin"
                : ""
            }
          />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Applications",
            value: applications.length,
            icon: Users,
          },
          {
            label: "Shortlisted",
            value: shortlistedCount,
            icon: CheckCircle2,
          },
          {
            label: "Interviews",
            value: interviewCount,
            icon: CalendarDays,
          },
          {
            label: "Selected",
            value: selectedCount,
            icon: CheckCircle2,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-[#111318]"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-100 p-3 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400">
                <item.icon size={20} />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-400">
                  {item.label}
                </p>

                <h2 className="mt-1 text-2xl font-bold text-gray-950 dark:text-white">
                  {item.value}
                </h2>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search
          size={17}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700 dark:text-gray-400"
        />

        <input
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm font-medium text-gray-950 placeholder:text-gray-600 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-[#111318] dark:text-white dark:placeholder:text-gray-400"
          placeholder="Search candidate or job..."
        />
      </div>

      {/* Error */}
      {applicationsQuery.isError && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          Unable to load applications. Please check your
          backend connection and refresh.
        </div>
      )}

      {/* Applications Table */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#111318] sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-gray-950 dark:text-white">
            Candidate Applications
          </h2>

          <p className="mt-1 text-sm text-gray-700 dark:text-gray-400">
            {filtered.length} application(s) found
          </p>
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          loading={applicationsQuery.isLoading}
          emptyMessage="No applications found."
        />
      </div>
    </div>
  );
}
