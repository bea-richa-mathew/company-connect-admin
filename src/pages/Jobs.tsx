
import { useEffect, useState } from "react";
import {
  Plus, Pencil, Trash2, X, Search, RefreshCw,
} from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";

import { useJobsQuery } from "../hooks/queryHooks";
import {
  useSaveJobMutation,
  useDeleteJobMutation,
} from "../hooks/mutationHooks";

import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import type { Job } from "../types";
import type { JobForm } from "../api/apiServices";

const emptyForm: JobForm = {
  title: "",
  department: "",
  location: "",
  type: "Full-time",
  experience: "Fresher",
  description: "",
  skills: "",
  deadline: "",
};

const labelClass =
  "mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200";

const fieldClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-[#343846] dark:bg-[#0c0e14] dark:text-white dark:placeholder:text-gray-500";

function getError(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message;
  }
  return error instanceof Error
    ? error.message
    : "Something went wrong.";
}

function localToday() {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

export default function Jobs() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [form, setForm] = useState<JobForm>({ ...emptyForm });

  const jobsQuery = useJobsQuery();

  const closeForm = () => {
    setShowForm(false);
    setEditingJob(null);
    setForm({ ...emptyForm });
  };

  const saveMutation = useSaveJobMutation({
    onSuccess: (_data, variables) => {
      toast.success(
        variables.id
          ? "Job updated successfully!"
          : "Job created successfully!"
      );
      closeForm();
    },
    onError: (error) =>
      toast.error(`Unable to save job: ${getError(error)}`),
  });

  const deleteMutation = useDeleteJobMutation({
    onSuccess: () =>
      toast.success("Job deleted successfully!"),
    onError: (error) =>
      toast.error(`Unable to delete job: ${getError(error)}`),
  });

  useEffect(() => {
    if (jobsQuery.isError) {
      toast.error(
        "Unable to load jobs. Please try refreshing the page."
      );
    }
  }, [jobsQuery.isError]);

  const jobs = jobsQuery.data?.data ?? [];

  const filteredJobs = jobs.filter((job) => {
    const term = search.trim().toLowerCase();
    return (
      job.title.toLowerCase().includes(term) ||
      job.department.toLowerCase().includes(term) ||
      job.location.toLowerCase().includes(term)
    );
  });

  const openCreate = () => {
    setEditingJob(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const openEdit = (job: Job) => {
    setEditingJob(job);
    setForm({
      title: job.title,
      department: job.department,
      location: job.location,
      type: job.type,
      experience: job.experience,
      description: job.description,
      skills: job.skills.join(", "),
      deadline: job.deadline
        ? job.deadline.slice(0, 10)
        : "",
    });
    setShowForm(true);
  };

  function updateField<K extends keyof JobForm>(
    key: K,
    value: JobForm[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function submitJob(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !form.title.trim() ||
      !form.department.trim() ||
      !form.location.trim() ||
      !form.description.trim()
    ) {
      toast.warning("Please fill in all required fields.");
      return;
    }

    if (form.deadline && form.deadline < localToday()) {
      toast.warning("The job deadline cannot be in the past.");
      return;
    }

    saveMutation.mutate({
      form,
      id: editingJob?._id,
    });
  }

  const columns = [
    {
      key: "title",
      header: "Position",
      render: (job: Job) => (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">
            {job.title}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {job.department}
          </p>
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (job: Job) => (
        <span className="text-gray-700 dark:text-gray-300">
          {job.location}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (job: Job) => (
        <span className="text-gray-700 dark:text-gray-300">
          {job.type}
        </span>
      ),
    },
    {
      key: "deadline",
      header: "Deadline",
      render: (job: Job) => (
        <span className="text-gray-700 dark:text-gray-300">
          {job.deadline
            ? new Date(job.deadline).toLocaleDateString()
            : "No deadline"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (job: Job) => (
        <StatusBadge value={job.status} />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (job: Job) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openEdit(job)}
            aria-label={`Edit ${job.title}`}
            className="rounded-lg border border-gray-300 p-2 text-indigo-600 hover:bg-indigo-50 dark:border-gray-700 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
          >
            <Pencil size={16} />
          </button>

          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (window.confirm(`Delete "${job.title}"?`)) {
                deleteMutation.mutate(job._id);
              }
            }}
            aria-label={`Delete ${job.title}`}
            className="rounded-lg border border-red-300 p-2 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950/30"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-gray-900 dark:text-white">
      {/* Heading */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Job Management
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Create, edit and manage job opportunities.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-500"
        >
          <Plus size={18} />
          Add Job
        </button>
      </div>

      {/* Search and Refresh */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, department or location..."
            className={`${fieldClass} pl-10`}
          />
        </div>

        <button
          type="button"
          onClick={() => void jobsQuery.refetch()}
          disabled={jobsQuery.isFetching}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <RefreshCw
            size={16}
            className={jobsQuery.isFetching ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Error */}
      {jobsQuery.isError && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          Failed to load jobs: {getError(jobsQuery.error)}
        </div>
      )}

      {/* Job Statistics */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Total Jobs", jobs.length],
          [
            "Open Jobs",
            jobs.filter((job) => job.status === "Open").length,
          ],
          [
            "Closed Jobs",
            jobs.filter((job) => job.status === "Closed").length,
          ],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-[#252936] dark:bg-[#101218]"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {label}
            </p>
            <h2 className="mt-2 text-3xl font-bold">
              {value}
            </h2>
          </div>
        ))}
      </div>

      {/* Jobs Table */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#252936] dark:bg-[#101218] sm:p-6">
        <div className="mb-4">
          <h2 className="font-semibold">Job Listings</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {filteredJobs.length} job(s) found
          </p>
        </div>

        <DataTable
          columns={columns}
          data={filteredJobs}
          loading={jobsQuery.isLoading}
          emptyMessage="No jobs found."
        />
      </div>

      {/* Add / Edit Job Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4"
          onClick={closeForm}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editingJob ? "Edit job" : "Add job"}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 text-gray-900 shadow-2xl dark:bg-[#14161e] dark:text-white"
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">
                {editingJob ? "Edit Job" : "Add New Job"}
              </h2>

              <button
                type="button"
                onClick={closeForm}
                aria-label="Close job form"
                className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submitJob} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["title", "Job Title"],
                    ["department", "Department"],
                    ["location", "Location"],
                    ["experience", "Experience"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <label htmlFor={`job-${key}`} className={labelClass}>
                      {label}
                    </label>
                    <input
                      id={`job-${key}`}
                      value={form[key]}
                      onChange={(event) =>
                        updateField(key, event.target.value)
                      }
                      required={key !== "experience"}
                      className={fieldClass}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label htmlFor="job-type" className={labelClass}>
                  Employment Type
                </label>
                <select
                  id="job-type"
                  value={form.type}
                  onChange={(event) =>
                    updateField(
                      "type",
                      event.target.value as Job["type"]
                    )
                  }
                  className={fieldClass}
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Internship">Internship</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>

              <div>
                <label htmlFor="job-deadline" className={labelClass}>
                  Application Deadline
                </label>
                <input
                  id="job-deadline"
                  type="date"
                  value={form.deadline}
                  min={editingJob ? undefined : localToday()}
                  onChange={(event) =>
                    updateField("deadline", event.target.value)
                  }
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="job-description" className={labelClass}>
                  Description
                </label>
                <textarea
                  id="job-description"
                  rows={5}
                  required
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="job-skills" className={labelClass}>
                  Required Skills (comma separated)
                </label>
                <input
                  id="job-skills"
                  value={form.skills}
                  onChange={(event) =>
                    updateField("skills", event.target.value)
                  }
                  placeholder="React, Node.js, MongoDB"
                  className={fieldClass}
                />
              </div>

              {saveMutation.isError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {getError(saveMutation.error)}
                </p>
              )}

              <div className="flex justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold dark:border-gray-700"
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
                    : editingJob
                      ? "Update Job"
                      : "Create Job"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
