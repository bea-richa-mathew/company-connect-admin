import { useEffect, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import axios from "axios";
import { toast } from "react-toastify";

import {
  Plus,
  X,
  Paperclip,
  RefreshCw,
  CheckCircle2,
  RotateCcw,
  Download,
  FileText,
} from "lucide-react";

import api from "../lib/api";

import {
  useEmployeesQuery,
  useTasksQuery,
} from "../hooks/queryHooks";

import {
  useCreateTaskMutation,
  useUpdateTaskMutation,
} from "../hooks/mutationHooks";

import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import TaskAttachments from "../components/TaskAttachments";

import type { Task } from "../types";

type ReviewStatus =
  | "Not Submitted"
  | "Pending Review"
  | "Approved"
  | "Changes Requested";

type TaskWithReview = Task & {
  reviewStatus?: ReviewStatus;
  reviewComment?: string;
};

interface Submission {
  _id: string;
  note: string;
  status: ReviewStatus;
  reviewComment?: string;
  createdAt: string;

  file?: {
    originalName?: string;
    size?: number;
  };

  submittedBy?: {
    name?: string;
  };
}

function getError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      (
        error.response
          ? `Request failed: ${error.response.status}`
          : "Cannot connect to the backend."
      )
    );
  }

  return error instanceof Error
    ? error.message
    : "Something went wrong.";
}

const labelClass =
  "mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200";

const fieldClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-[#343846] dark:bg-[#0c0e14] dark:text-white dark:placeholder:text-gray-500";

const primaryButton =
  "rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
  "rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-[#14161e] dark:text-gray-200 dark:hover:bg-gray-800";

function getTodayDate() {
  const today = new Date();

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

function getReviewStatus(
  task: TaskWithReview
): ReviewStatus {
  return task.reviewStatus || "Not Submitted";
}

export default function Tasks() {
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);

  const [attachmentTask, setAttachmentTask] =
    useState<Task | null>(null);

  const [reviewTaskId, setReviewTaskId] =
    useState<string | null>(null);

  const [reviewComment, setReviewComment] =
    useState("");

  const [downloadId, setDownloadId] =
    useState<string | null>(null);

  const [employee, setEmployee] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [priority, setPriority] =
    useState<Task["priority"]>("Medium");

  const minDueDate = getTodayDate();

  const employeesQuery = useEmployeesQuery();
  const tasksQuery = useTasksQuery();

  const createMutation = useCreateTaskMutation({
    onSuccess: () => {
      toast.success("Task assigned successfully!");

      setShowForm(false);
      setEmployee("");
      setTitle("");
      setDescription("");
      setDueDate("");
      setPriority("Medium");
    },

    onError: (error) => {
      toast.error(
        `Unable to assign task: ${getError(error)}`
      );
    },
  });

  const updateMutation = useUpdateTaskMutation({
    onSuccess: () => {
      toast.success(
        "Task status updated successfully!"
      );
    },

    onError: (error) => {
      toast.error(
        `Unable to update task status: ${getError(error)}`
      );
    },
  });

  useEffect(() => {
    if (employeesQuery.isError) {
      toast.error(
        `Unable to load employees: ${getError(
          employeesQuery.error
        )}`
      );
    }
  }, [
    employeesQuery.isError,
    employeesQuery.error,
  ]);

  useEffect(() => {
    if (tasksQuery.isError) {
      toast.error(
        `Unable to load tasks: ${getError(
          tasksQuery.error
        )}`
      );
    }
  }, [
    tasksQuery.isError,
    tasksQuery.error,
  ]);

  // Refresh admin tasks to detect employee submissions.
  useEffect(() => {
    const timer = window.setInterval(() => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks"],
      });
    }, 10000);

    return () => window.clearInterval(timer);
  }, [queryClient]);

  const submissionsQuery = useQuery({
    queryKey: [
      "task-submissions",
      reviewTaskId,
    ],
    enabled: Boolean(reviewTaskId),
    refetchInterval: 10000,

    queryFn: async () => {
      const response = await api.get<{
        success: boolean;
        data: Submission[];
      }>(
        `/tasks/${reviewTaskId}/submissions`
      );

      return response.data.data;
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (input: {
      submissionId: string;
      decision: "approve" | "request_changes";
    }) => {
      if (!reviewTaskId) {
        throw new Error("No task selected");
      }

      const response = await api.patch(
        `/tasks/${reviewTaskId}/submissions/${input.submissionId}/review`,
        {
          decision: input.decision,
          comment: reviewComment.trim(),
        }
      );

      return response.data;
    },

    onSuccess: async () => {
      toast.success(
        "Task review saved successfully"
      );

      setReviewComment("");

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [
            "task-submissions",
            reviewTaskId,
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: ["tasks"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["employee-performance"],
        }),
      ]);

      void tasksQuery.refetch();
    },

    onError: (error: unknown) => {
      toast.error(getError(error));
    },
  });

  async function downloadSubmission(
    submission: Submission
  ) {
    if (!reviewTaskId) return;

    setDownloadId(submission._id);

    let objectUrl: string | null = null;

    try {
      const response = await api.get(
        `/tasks/${reviewTaskId}/submissions/${submission._id}/download`,
        {
          responseType: "blob",
        }
      );

      objectUrl = URL.createObjectURL(
        response.data as Blob
      );

      const link = document.createElement("a");

      link.href = objectUrl;
      link.download =
        submission.file?.originalName ||
        "submission";

      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error(getError(error));
    } finally {
      if (objectUrl) {
        const url = objectUrl;

        window.setTimeout(
          () => URL.revokeObjectURL(url),
          1000
        );
      }

      setDownloadId(null);
    }
  }

  const tasks = tasksQuery.data?.data ?? [];
  const employees = employeesQuery.data ?? [];

  function closeForm() {
    setShowForm(false);
    setEmployee("");
    setTitle("");
    setDescription("");
    setDueDate("");
    setPriority("Medium");
    createMutation.reset();
  }

  function submitTask(event: React.FormEvent) {
    event.preventDefault();

    if (!employee) {
      toast.warning("Please select an employee.");
      return;
    }

    if (!title.trim()) {
      toast.warning("Please enter a task title.");
      return;
    }

    if (dueDate && dueDate < getTodayDate()) {
      toast.warning(
        "Past dates are not allowed. Select today or a future date."
      );
      return;
    }

    createMutation.mutate({
      assignedTo: employee,
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate || undefined,
      priority,
    });
  }

  const columns = [
    {
      key: "task",
      header: "Task",
      render: (task: Task) => (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">
            {task.title}
          </p>

          <p className="mt-1 max-w-xs truncate text-xs text-gray-500 dark:text-gray-400">
            {task.description || "No description"}
          </p>
        </div>
      ),
    },

    {
      key: "employee",
      header: "Assigned To",
      render: (task: Task) => (
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {task.assignedTo?.name || "—"}
          </p>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {task.assignedTo?.employeeId || ""}
          </p>
        </div>
      ),
    },

    {
      key: "due",
      header: "Due Date",
      render: (task: Task) => (
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {task.dueDate
            ? new Date(
                task.dueDate
              ).toLocaleDateString()
            : "—"}
        </span>
      ),
    },

    {
      key: "priority",
      header: "Priority",
      render: (task: Task) => (
        <StatusBadge value={task.priority} />
      ),
    },

    {
      key: "status",
      header: "Status",
      render: (task: Task) => {
        const reviewStatus = getReviewStatus(
          task as TaskWithReview
        );

        return (
          <select
            value={task.status}
            disabled={
              updateMutation.isPending ||
              reviewStatus === "Pending Review" ||
              task.status === "Completed"
            }
            onChange={(event) =>
              updateMutation.mutate({
                id: task._id,
                status: event.target
                  .value as Task["status"],
              })
            }
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 outline-none focus:border-indigo-500 disabled:opacity-50 dark:border-[#343846] dark:bg-[#0c0e14] dark:text-gray-200"
          >
            <option value="Pending">
              Pending
            </option>

            <option value="In Progress">
              In Progress
            </option>

            {task.status === "Completed" && (
              <option value="Completed">
                Completed
              </option>
            )}
          </select>
        );
      },
    },

    {
      key: "review",
      header: "Approval",
      render: (task: Task) => {
        const reviewStatus = getReviewStatus(
          task as TaskWithReview
        );

        return (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              {reviewStatus}
            </p>

            <button
              type="button"
              onClick={() => {
                setReviewTaskId(task._id);
                setReviewComment("");
              }}
              className="rounded-lg border border-indigo-300 px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-indigo-500/40 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
            >
              {reviewStatus === "Pending Review"
                ? "Review / Approve"
                : "View Submissions"}
            </button>
          </div>
        );
      },
    },

    {
      key: "attachments",
      header: "Attachments",
      render: (task: Task) => (
        <button
          type="button"
          onClick={() => setAttachmentTask(task)}
          className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
        >
          <Paperclip size={15} />
          View Files
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Task Management
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Assign tasks, monitor progress,
            manage attachments and approve submissions.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              void tasksQuery.refetch();
              void employeesQuery.refetch();
            }}
            disabled={
              tasksQuery.isFetching ||
              employeesQuery.isFetching
            }
            className={secondaryButton}
          >
            <span className="inline-flex items-center gap-2">
              <RefreshCw
                size={16}
                className={
                  tasksQuery.isFetching
                    ? "animate-spin"
                    : ""
                }
              />
              Refresh
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowForm(true)}
            className={primaryButton}
          >
            <span className="inline-flex items-center gap-2">
              <Plus size={17} />
              Assign Task
            </span>
          </button>
        </div>
      </div>

      {/* Query Errors */}
      {tasksQuery.isError && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          Failed to load tasks:{" "}
          {getError(tasksQuery.error)}
        </div>
      )}

      {employeesQuery.isError && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          Failed to load employees:{" "}
          {getError(employeesQuery.error)}
        </div>
      )}

      {/* Existing Task Table */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#252936] dark:bg-[#101218] sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Assigned Tasks
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {tasks.length} task(s) found
          </p>
        </div>

        <DataTable
          columns={columns}
          data={tasks}
          loading={tasksQuery.isLoading}
          emptyMessage="No tasks assigned yet."
        />
      </div>

      {/* Submission Approval Modal */}
      {reviewTaskId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4"
          onClick={() => setReviewTaskId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Review task submission"
            onClick={(event) =>
              event.stopPropagation()
            }
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 text-gray-900 shadow-2xl dark:bg-[#14161e] dark:text-white"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">
                  Submission Review
                </h2>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {tasks.find(
                    (item) =>
                      item._id === reviewTaskId
                  )?.title || "Task"}
                </p>
              </div>

              <button
                type="button"
                aria-label="Close review"
                onClick={() =>
                  setReviewTaskId(null)
                }
                className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X size={20} />
              </button>
            </div>

            {submissionsQuery.isLoading && (
              <p className="text-sm text-gray-500">
                Loading submissions...
              </p>
            )}

            {submissionsQuery.isError && (
              <p className="text-sm text-red-500">
                {getError(submissionsQuery.error)}
              </p>
            )}

            {!submissionsQuery.isLoading &&
              !submissionsQuery.data?.length && (
                <p className="text-sm text-gray-500">
                  No submissions yet.
                </p>
              )}

            <div className="space-y-4">
              {(submissionsQuery.data ?? []).map(
                (submission, index) => (
                  <div
                    key={submission._id}
                    className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-[#0c0e14]"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <strong className="text-sm">
                        {submission.status}
                      </strong>

                      <span className="text-xs text-gray-500">
                        {new Date(
                          submission.createdAt
                        ).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500">
                      Submitted by{" "}
                      {submission.submittedBy?.name ||
                        "Employee"}
                    </p>

                    {submission.note && (
                      <p className="whitespace-pre-wrap text-sm">
                        {submission.note}
                      </p>
                    )}

                    {submission.file?.originalName && (
                      <button
                        type="button"
                        disabled={
                          downloadId === submission._id
                        }
                        onClick={() =>
                          void downloadSubmission(
                            submission
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 px-3 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400"
                      >
                        <FileText size={15} />

                        {submission.file.originalName}

                        <Download size={15} />
                      </button>
                    )}

                    {submission.reviewComment && (
                      <p className="rounded-lg bg-white p-3 text-sm dark:bg-gray-800">
                        <strong>
                          Admin feedback:
                        </strong>{" "}
                        {submission.reviewComment}
                      </p>
                    )}

                    {index === 0 &&
                      submission.status ===
                        "Pending Review" && (
                        <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
                          <label className={labelClass}>
                            Review Feedback
                          </label>

                          <textarea
                            rows={3}
                            maxLength={10000}
                            value={reviewComment}
                            onChange={(event) =>
                              setReviewComment(
                                event.target.value
                              )
                            }
                            placeholder="Feedback required when requesting changes"
                            className={fieldClass}
                          />

                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              disabled={
                                reviewMutation.isPending
                              }
                              onClick={() =>
                                reviewMutation.mutate({
                                  submissionId:
                                    submission._id,
                                  decision: "approve",
                                })
                              }
                              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                              <CheckCircle2 size={16} />
                              Approve
                            </button>

                            <button
                              type="button"
                              disabled={
                                reviewMutation.isPending ||
                                !reviewComment.trim()
                              }
                              onClick={() =>
                                reviewMutation.mutate({
                                  submissionId:
                                    submission._id,
                                  decision:
                                    "request_changes",
                                })
                              }
                              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                              <RotateCcw size={16} />
                              Request Changes
                            </button>
                          </div>
                        </div>
                      )}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Existing Task Attachments Modal */}
      {attachmentTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4"
          onClick={() =>
            setAttachmentTask(null)
          }
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Task attachments"
            onClick={(event) =>
              event.stopPropagation()
            }
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 text-gray-900 shadow-2xl dark:bg-[#14161e] dark:text-white"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  Task Attachments
                </h2>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {attachmentTask.title}
                </p>
              </div>

              <button
                type="button"
                aria-label="Close attachments"
                onClick={() =>
                  setAttachmentTask(null)
                }
                className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X size={20} />
              </button>
            </div>

            <TaskAttachments
              taskId={attachmentTask._id}
            />
          </div>
        </div>
      )}

      {/* Existing Assign Task Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4"
          onClick={closeForm}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Assign task"
            onClick={(event) =>
              event.stopPropagation()
            }
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 text-gray-900 shadow-2xl dark:bg-[#14161e] dark:text-white"
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">
                  Assign New Task
                </h2>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Create and assign work to an employee.
                </p>
              </div>

              <button
                type="button"
                aria-label="Close task form"
                onClick={closeForm}
                className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={submitTask}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="task-employee"
                  className={labelClass}
                >
                  Assign To
                </label>

                <select
                  id="task-employee"
                  value={employee}
                  onChange={(event) =>
                    setEmployee(event.target.value)
                  }
                  required
                  className={fieldClass}
                >
                  <option value="">
                    Select Employee
                  </option>

                  {employees
                    .filter(
                      (item) =>
                        item.role === "employee"
                    )
                    .map((item) => (
                      <option
                        key={item._id}
                        value={item._id}
                      >
                        {item.name}
                        {item.employeeId
                          ? ` (${item.employeeId})`
                          : ""}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="task-title"
                  className={labelClass}
                >
                  Task Title
                </label>

                <input
                  id="task-title"
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  placeholder="Enter task title"
                  required
                  className={fieldClass}
                />
              </div>

              <div>
                <label
                  htmlFor="task-due-date"
                  className={labelClass}
                >
                  Due Date
                </label>

                <input
                  id="task-due-date"
                  type="date"
                  value={dueDate}
                  min={minDueDate}
                  onChange={(event) =>
                    setDueDate(event.target.value)
                  }
                  className={fieldClass}
                />

                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Past dates cannot be selected.
                </p>
              </div>

              <div>
                <label
                  htmlFor="task-priority"
                  className={labelClass}
                >
                  Priority
                </label>

                <select
                  id="task-priority"
                  value={priority}
                  onChange={(event) =>
                    setPriority(
                      event.target
                        .value as Task["priority"]
                    )
                  }
                  className={fieldClass}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="task-description"
                  className={labelClass}
                >
                  Description
                </label>

                <textarea
                  id="task-description"
                  rows={5}
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  placeholder="Enter task description"
                  className={fieldClass}
                />
              </div>

              {createMutation.isError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {getError(
                    createMutation.error
                  )}
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">
                <button
                  type="button"
                  onClick={closeForm}
                  className={secondaryButton}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    createMutation.isPending
                  }
                  className={primaryButton}
                >
                  {createMutation.isPending
                    ? "Assigning..."
                    : "Assign Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}