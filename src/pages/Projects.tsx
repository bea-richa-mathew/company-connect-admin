
import { useState } from "react";
import { toast } from "react-toastify";
import axios from "axios";

import {
  Mail,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Send,
  X,
} from "lucide-react";

import {
  useProjectsQuery,
  useProjectEmployeesQuery,
} from "../hooks/queryHooks";

import {
  useSaveProjectMutation,
  useDeleteProjectMutation,
  usePublishProjectMutation,
  useProjectPermissionMutation,
  useRemoveProjectEmployeeMutation,
  useReviewProjectMutation,
} from "../hooks/mutationHooks";

import type {
  Project,
  ProjectStatus,
} from "../types/project";

import type {
  ProjectForm,
} from "../api/apiServices";

// ==========================================
// DEFAULT PROJECT FORM
// ==========================================

const emptyForm: ProjectForm = {
  title: "",
  slug: "",
  category: "",
  description: "",
  summary: "",
  problem: "",
  solution: "",
  features: "",
  technologies: "",
  imageUrl: "",
  projectUrl: "",
  status: "Planning",
};

// ==========================================
// STYLES
// ==========================================

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-950 placeholder:text-gray-600 outline-none focus:border-indigo-500 dark:border-admin-border dark:bg-[#08090d] dark:text-white dark:placeholder:text-gray-400";

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50";

const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 dark:border-admin-border dark:bg-[#151820] dark:text-white dark:hover:bg-white/10 disabled:opacity-50";

const emailButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20";

// ==========================================
// ERROR HANDLER
// ==========================================

function getError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      error.message
    );
  }

  return error instanceof Error
    ? error.message
    : "Something went wrong.";
}

// ==========================================
// PROJECT FORM MAPPING
// ==========================================

function toForm(project: Project): ProjectForm {
  return {
    title: project.title,
    slug: project.slug,
    category: project.category,
    description: project.description,
    summary: project.summary || "",
    problem: project.problem || "",
    solution: project.solution || "",
    features: (project.features || []).join("\n"),
    technologies: (project.technologies || []).join("\n"),
    imageUrl: project.imageUrl || "",
    projectUrl: project.projectUrl || "",
    status: project.status,
  };
}

// ==========================================
// EMAIL FUNCTION
// ==========================================

function sendProjectEmail({
  employeeName,
  employeeEmail,
  projectTitle,
  projectStatus,
  reviewStatus,
  projectDescription,
}: {
  employeeName: string;
  employeeEmail?: string;
  projectTitle: string;
  projectStatus: string;
  reviewStatus: string;
  projectDescription?: string;
}) {
  const email = employeeEmail?.trim();

  if (!email) {
    toast.warning(
      "Employee email address is not available."
    );
    return;
  }

  const subject =
    `Project Update - ${projectTitle} | Pinnacle Smart Technologies`;

  const body = `Dear ${employeeName},

I hope you are doing well.

This email is regarding your assigned project at Pinnacle Smart Technologies.

PROJECT DETAILS

Project Name: ${projectTitle}
Current Status: ${projectStatus}
Review Status: ${reviewStatus}

${
  projectDescription
    ? `Project Description:\n${projectDescription}\n\n`
    : ""
}Please review your assigned project and provide an update on the current progress.

Kindly ensure that the assigned responsibilities are completed according to the project requirements.

If you have any questions, face any challenges, or require assistance, please feel free to contact the administration team.

Best regards,
Project Management Team
Pinnacle Smart Technologies`;

  const mailtoLink =
    `mailto:${email}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;

  window.location.href = mailtoLink;
}

// ==========================================
// PROJECTS COMPONENT
// ==========================================

export default function Projects() {
  const [showForm, setShowForm] =
    useState(false);

  const [editing, setEditing] =
    useState<Project | null>(null);

  const [form, setForm] =
    useState<ProjectForm>(emptyForm);

  const [selectedEmployee, setSelectedEmployee] =
    useState<Record<string, string>>({});

  const [reviewing, setReviewing] =
    useState<Project | null>(null);

  const [reviewComment, setReviewComment] =
    useState("");

  // ========================================
  // QUERY HOOKS
  // ========================================

  const projectsQuery = useProjectsQuery();

  const employeesQuery =
    useProjectEmployeesQuery();

  // ========================================
  // MUTATION HOOKS
  // ========================================

  const saveMutation = useSaveProjectMutation({
    onSuccess: () => {
      toast.success(
        "Project saved successfully."
      );

      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
    },

    onError: (error) =>
      toast.error(getError(error)),
  });

  const deleteMutation =
    useDeleteProjectMutation({
      onSuccess: () =>
        toast.success(
          "Project deleted successfully."
        ),

      onError: (error) =>
        toast.error(getError(error)),
    });

  const publishMutation =
    usePublishProjectMutation({
      onSuccess: () =>
        toast.success(
          "Project published successfully. The public website now has the latest approved version."
        ),

      onError: (error) =>
        toast.error(getError(error)),
    });

  const permissionMutation =
    useProjectPermissionMutation({
      onSuccess: () =>
        toast.success(
          "Employee permission updated."
        ),

      onError: (error) =>
        toast.error(getError(error)),
    });

  const removeEmployeeMutation =
    useRemoveProjectEmployeeMutation({
      onSuccess: () =>
        toast.success(
          "Employee removed from project."
        ),

      onError: (error) =>
        toast.error(getError(error)),
    });

  const reviewMutation =
    useReviewProjectMutation({
      onSuccess: () => {
        toast.success(
          "Project review updated successfully."
        );

        setReviewing(null);
        setReviewComment("");
      },

      onError: (error) =>
        toast.error(getError(error)),
    });

  // ========================================
  // DATA
  // ========================================

  const projects =
    projectsQuery.data ?? [];

  const employees =
    employeesQuery.data ?? [];

  const pendingProjects =
    projects.filter(
      (project) =>
        project.reviewStatus === "Pending Review"
    );

  const completedProjects =
    projects.filter(
      (project) =>
        project.status === "Completed"
    );

  const publishedProjects =
    projects.filter(
      (project) => project.isPublished
    );

  // ========================================
  // PROJECT FORM HANDLERS
  // ========================================

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  }

  function openEdit(project: Project) {
    setEditing(project);
    setForm(toForm(project));
    setShowForm(true);
  }

  function updateField<
    K extends keyof ProjectForm
  >(
    field: K,
    value: ProjectForm[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="space-y-7 text-gray-950 dark:text-white">
      {/* ==================================
          PAGE HEADER
      ================================== */}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-400">
            Project Administration
          </p>

          <h1 className="text-3xl font-bold text-gray-950 dark:text-white">
            Project Management
          </h1>

          <p className="mt-2 text-sm text-gray-700 dark:text-gray-400">
            Manage employee projects, completion reviews,
            permissions, publishing and communication.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              void projectsQuery.refetch()
            }
            disabled={projectsQuery.isFetching}
            className={secondaryButton}
          >
            <RefreshCw
              size={16}
              className={
                projectsQuery.isFetching
                  ? "animate-spin"
                  : ""
              }
            />

            {projectsQuery.isFetching
              ? "Refreshing..."
              : "Refresh"}
          </button>

          <button
            type="button"
            onClick={openCreate}
            className={primaryButton}
          >
            <Plus size={17} />
            Add Project
          </button>
        </div>
      </div>

      {/* ==================================
          STATISTICS
      ================================== */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Projects",
            value: projects.length,
          },
          {
            label: "Completed",
            value: completedProjects.length,
          },
          {
            label: "Pending Review",
            value: pendingProjects.length,
          },
          {
            label: "Published",
            value: publishedProjects.length,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-admin-border dark:bg-admin-card"
          >
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-400">
              {item.label}
            </p>

            <h2 className="mt-2 text-3xl font-extrabold text-gray-950 dark:text-white">
              {item.value}
            </h2>
          </div>
        ))}
      </div>

      {/* ==================================
          PENDING REVIEW ALERT
      ================================== */}

      {pendingProjects.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-700 dark:bg-amber-500/10">
          <h2 className="text-lg font-bold text-amber-900 dark:text-amber-300">
            {pendingProjects.length} Project
            {pendingProjects.length !== 1
              ? "s"
              : ""}{" "}
            Awaiting Approval
          </h2>

          <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
            Employees have submitted completed projects.
            Review them before publishing.
          </p>
        </div>
      )}

      {/* ==================================
          QUERY STATES
      ================================== */}

      {projectsQuery.isLoading && (
        <p className="text-sm font-medium text-gray-800 dark:text-gray-300">
          Loading projects...
        </p>
      )}

      {projectsQuery.isError && (
        <p className="text-sm font-medium text-red-600">
          {getError(projectsQuery.error)}
        </p>
      )}

      {employeesQuery.isError && (
        <p className="text-sm font-medium text-red-600">
          Unable to load employees:{" "}
          {getError(employeesQuery.error)}
        </p>
      )}

      {!projectsQuery.isLoading &&
        !projectsQuery.isError &&
        projects.length === 0 && (
          <p className="rounded-2xl border border-gray-200 bg-white p-8 text-gray-800 dark:border-admin-border dark:bg-admin-card dark:text-gray-300">
            No projects found.
          </p>
        )}

      {/* ==================================
          PROJECT CARDS
      ================================== */}

      <div className="grid gap-6 lg:grid-cols-2">
        {projects.map((project) => {
          const reviewStatus =
            project.reviewStatus ||
            "Not Submitted";

          const isPending =
            reviewStatus ===
            "Pending Review";

          const isApproved =
            reviewStatus === "Approved";

          const canPublish =
            project.status ===
              "Completed" &&
            isApproved;

          const needsRepublishing =
            project.isPublished &&
            !isApproved;

          return (
            <article
              key={project._id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-admin-border dark:bg-admin-card"
            >
              {/* Project Image */}

              {project.imageUrl && (
                <img
                  src={project.imageUrl}
                  alt={project.title}
                  className="mb-5 h-44 w-full rounded-xl object-cover"
                />
              )}

              {/* Project Information */}

              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-indigo-700 dark:text-indigo-400">
                    {project.category}
                  </p>

                  <h2 className="mt-2 text-xl font-bold text-gray-950 dark:text-white">
                    {project.title}
                  </h2>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    project.isPublished
                      ? "bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                  }`}
                >
                  {project.isPublished
                    ? "Published"
                    : "Not Published"}
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-gray-800 dark:text-gray-300">
                {project.description}
              </p>

              {/* Status Badges */}

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-500/15 dark:text-blue-300">
                  Employee Status:{" "}
                  {project.status}
                </span>

                <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800 dark:bg-purple-500/15 dark:text-purple-300">
                  Review: {reviewStatus}
                </span>
              </div>

              {/* Pending Review */}

              {isPending && (
                <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-500/10">
                  <p className="font-semibold text-amber-900 dark:text-amber-300">
                    Employee Submitted Completion
                  </p>

                  <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                    This project is waiting for admin approval.
                  </p>
                </div>
              )}

              {/* Republishing Information */}

              {needsRepublishing && (
                <p className="mt-3 rounded-xl bg-purple-50 p-3 text-sm text-purple-800 dark:bg-purple-500/10 dark:text-purple-300">
                  Employee changes are available in the
                  admin panel. The public website still
                  displays the last published version.
                </p>
              )}

              {/* Admin Feedback */}

              {project.reviewComment && (
                <p className="mt-3 rounded-xl border border-gray-200 p-3 text-sm text-gray-900 dark:border-admin-border dark:text-gray-200">
                  Admin Feedback:{" "}
                  {project.reviewComment}
                </p>
              )}

              {/* ==================================
                  PROJECT ACTIONS
              ================================== */}

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    openEdit(project)
                  }
                  className={primaryButton}
                >
                  <Pencil size={15} />
                  Edit Project
                </button>

                {isPending && (
                  <button
                    type="button"
                    onClick={() => {
                      setReviewing(project);
                      setReviewComment("");
                    }}
                    className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
                  >
                    Review Completion
                  </button>
                )}

                {canPublish && (
                  <button
                    type="button"
                    disabled={
                      publishMutation.isPending
                    }
                    onClick={() =>
                      publishMutation.mutate(
                        project._id
                      )
                    }
                    className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50"
                  >
                    Publish
                  </button>
                )}

                {project.isPublished &&
                  !canPublish && (
                    <button
                      type="button"
                      disabled
                      className="rounded-xl bg-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                    >
                      Published
                    </button>
                  )}

                <button
                  type="button"
                  disabled={
                    deleteMutation.isPending
                  }
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete "${project.title}" permanently?`
                      )
                    ) {
                      deleteMutation.mutate(
                        project._id
                      );
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                >
                  <Trash2 size={15} />
                  Delete
                </button>
              </div>

              {/* ==================================
                  EMPLOYEE PERMISSIONS
              ================================== */}

              <div className="mt-6 border-t border-gray-200 pt-5 dark:border-admin-border">
                <h3 className="text-base font-bold text-gray-950 dark:text-white">
                  Employee Permissions
                </h3>

                <p className="mt-1 text-xs text-gray-700 dark:text-gray-400">
                  Employees with Can edit enabled can
                  update projects even after publication.
                </p>

                {(project.assignedEmployees || []).map(
                  (member) =>
                    member.employee && (
                      <div
                        key={
                          member.employee._id
                        }
                        className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-admin-border dark:bg-[#0c0e14]"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          {/* Employee Details */}

                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-950 dark:text-white">
                              {
                                member.employee
                                  .name
                              }
                            </p>

                            <p className="mt-1 break-all text-xs text-gray-700 dark:text-gray-400">
                              {member.employee
                                .employeeId ||
                                member.employee
                                  .email}
                            </p>
                          </div>

                          {/* Permission + Remove */}

                          <div className="flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-200">
                              <input
                                type="checkbox"
                                checked={
                                  member.canEdit
                                }
                                disabled={
                                  permissionMutation.isPending
                                }
                                onChange={(
                                  event
                                ) =>
                                  permissionMutation.mutate(
                                    {
                                      projectId:
                                        project._id,
                                      employeeId:
                                        member
                                          .employee
                                          ._id,
                                      canEdit:
                                        event
                                          .target
                                          .checked,
                                    }
                                  )
                                }
                                className="h-4 w-4 accent-indigo-600"
                              />

                              Can edit
                            </label>

                            <button
                              type="button"
                              disabled={
                                removeEmployeeMutation.isPending
                              }
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Remove ${member.employee.name} from this project?`
                                  )
                                ) {
                                  removeEmployeeMutation.mutate(
                                    {
                                      projectId:
                                        project._id,
                                      employeeId:
                                        member
                                          .employee
                                          ._id,
                                    }
                                  );
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                            >
                              <X size={14} />
                              Remove
                            </button>
                          </div>
                        </div>

                        {/* NEW: SEND EMAIL BUTTON */}

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-3 dark:border-gray-800">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-400">
                            Contact this employee
                            about the project.
                          </p>

                          <button
                            type="button"
                            disabled={
                              !member.employee
                                .email
                            }
                            onClick={() =>
                              sendProjectEmail({
                                employeeName:
                                  member
                                    .employee
                                    .name,

                                employeeEmail:
                                  member
                                    .employee
                                    .email,

                                projectTitle:
                                  project.title,

                                projectStatus:
                                  project.status,

                                reviewStatus,

                                projectDescription:
                                  project.description,
                              })
                            }
                            className={
                              emailButton
                            }
                          >
                            <Mail size={15} />
                            Send Email
                            <Send size={13} />
                          </button>
                        </div>
                      </div>
                    )
                )}

                {(project.assignedEmployees || [])
                  .length === 0 && (
                    <p className="mt-3 text-sm text-gray-700 dark:text-gray-400">
                      No employees assigned.
                    </p>
                  )}

                {/* ==================================
                    ASSIGN EMPLOYEE
                ================================== */}

                <div className="mt-4 flex flex-wrap gap-3">
                  <select
                    value={
                      selectedEmployee[
                        project._id
                      ] || ""
                    }
                    onChange={(event) =>
                      setSelectedEmployee(
                        (previous) => ({
                          ...previous,
                          [project._id]:
                            event.target
                              .value,
                        })
                      )
                    }
                    className={`min-w-0 flex-1 ${inputClass}`}
                  >
                    <option value="">
                      Select employee to assign
                    </option>

                    {employees
                      .filter(
                        (employee) =>
                          !(
                            project.assignedEmployees ||
                            []
                          ).some(
                            (member) =>
                              member.employee
                                ?._id ===
                              employee._id
                          )
                      )
                      .map((employee) => (
                        <option
                          key={
                            employee._id
                          }
                          value={
                            employee._id
                          }
                        >
                          {employee.name}
                          {employee.employeeId
                            ? ` (${employee.employeeId})`
                            : ""}
                        </option>
                      ))}
                  </select>

                  <button
                    type="button"
                    disabled={
                      !selectedEmployee[
                        project._id
                      ] ||
                      permissionMutation.isPending
                    }
                    onClick={() => {
                      const employeeId =
                        selectedEmployee[
                          project._id
                        ];

                      if (!employeeId)
                        return;

                      permissionMutation.mutate(
                        {
                          projectId:
                            project._id,
                          employeeId,
                          canEdit: false,
                        },
                        {
                          onSuccess: () => {
                            setSelectedEmployee(
                              (previous) => ({
                                ...previous,
                                [project._id]:
                                  "",
                              })
                            );
                          },
                        }
                      );
                    }}
                    className={primaryButton}
                  >
                    Assign Employee
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* ==================================
          ADD / EDIT PROJECT MODAL
      ================================== */}

      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 px-4 py-8">
          <div className="mx-auto w-full max-w-3xl rounded-3xl bg-white p-6 text-gray-950 shadow-2xl dark:bg-admin-card dark:text-white">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {editing
                  ? "Edit Project"
                  : "Add Project"}
              </h2>

              <button
                type="button"
                onClick={() =>
                  setShowForm(false)
                }
                className="text-2xl"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();

                if (
                  !form.title.trim() ||
                  !form.category.trim() ||
                  !form.description.trim()
                ) {
                  toast.warning(
                    "Title, category and description are required."
                  );

                  return;
                }

                saveMutation.mutate({
                  form,
                  id: editing?._id,
                });
              }}
              className="space-y-4"
            >
              {(
                [
                  [
                    "title",
                    "Project Title",
                  ],
                  [
                    "slug",
                    "Project Slug",
                  ],
                  [
                    "category",
                    "Category",
                  ],
                  [
                    "description",
                    "Short Description",
                  ],
                  [
                    "summary",
                    "Case Study Summary",
                  ],
                  [
                    "problem",
                    "The Challenge",
                  ],
                  [
                    "solution",
                    "The Solution",
                  ],
                  [
                    "features",
                    "Features (one per line)",
                  ],
                  [
                    "technologies",
                    "Technologies (one per line)",
                  ],
                  [
                    "imageUrl",
                    "Image URL",
                  ],
                  [
                    "projectUrl",
                    "Project Website URL",
                  ],
                ] as const
              ).map(
                ([key, label]) => (
                  <label
                    key={key}
                    className="block"
                  >
                    <span className="mb-2 block text-sm font-semibold text-gray-900 dark:text-gray-200">
                      {label}
                    </span>

                    {(
                      [
                        "description",
                        "summary",
                        "problem",
                        "solution",
                        "features",
                        "technologies",
                      ] as string[]
                    ).includes(key) ? (
                      <textarea
                        rows={4}
                        value={
                          form[key]
                        }
                        onChange={(
                          event
                        ) =>
                          updateField(
                            key,
                            event
                              .target
                              .value
                          )
                        }
                        className={
                          inputClass
                        }
                      />
                    ) : (
                      <input
                        value={
                          form[key]
                        }
                        onChange={(
                          event
                        ) =>
                          updateField(
                            key,
                            event
                              .target
                              .value
                          )
                        }
                        className={
                          inputClass
                        }
                      />
                    )}
                  </label>
                )
              )}

              {/* Project Status */}

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-900 dark:text-gray-200">
                  Project Status
                </span>

                <select
                  value={form.status}
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "status",
                      event
                        .target
                        .value as ProjectStatus
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="Planning">
                    Planning
                  </option>

                  <option value="In Progress">
                    In Progress
                  </option>

                  <option value="Completed">
                    Completed
                  </option>

                  <option value="On Hold">
                    On Hold
                  </option>
                </select>
              </label>

              {/* Form Buttons */}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() =>
                    setShowForm(false)
                  }
                  className={
                    secondaryButton
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saveMutation.isPending
                  }
                  className={
                    primaryButton
                  }
                >
                  {saveMutation.isPending
                    ? "Saving..."
                    : "Save Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================
          COMPLETION REVIEW MODAL
      ================================== */}

      {reviewing && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 px-4 py-8">
          <div className="mx-auto w-full max-w-2xl rounded-3xl bg-white p-6 text-gray-950 shadow-2xl dark:bg-admin-card dark:text-white">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">
                Review Completed Project
              </h2>

              <button
                type="button"
                onClick={() =>
                  setReviewing(null)
                }
                className="text-2xl"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <h3 className="mt-4 text-lg font-semibold">
              {reviewing.title}
            </h3>

            <p className="mt-2 text-sm text-gray-700 dark:text-gray-400">
              The employee submitted this project
              as Completed. Review the details
              before approving.
            </p>

            {/* Review Details */}

            <div className="mt-5 max-h-80 space-y-4 overflow-y-auto rounded-xl border border-gray-200 p-4 text-sm dark:border-admin-border">
              {(
                [
                  [
                    "Description",
                    reviewing.description,
                  ],
                  [
                    "Summary",
                    reviewing.summary,
                  ],
                  [
                    "The Challenge",
                    reviewing.problem,
                  ],
                  [
                    "The Solution",
                    reviewing.solution,
                  ],
                ] as const
              ).map(
                ([label, value]) => (
                  <div key={label}>
                    <h4 className="font-bold">
                      {label}
                    </h4>

                    <p className="mt-1 whitespace-pre-line text-gray-800 dark:text-gray-300">
                      {value ||
                        "Not provided."}
                    </p>
                  </div>
                )
              )}

              {/* Features */}

              <div>
                <h4 className="font-bold">
                  Features
                </h4>

                <ul className="mt-1 list-inside list-disc text-gray-800 dark:text-gray-300">
                  {(
                    reviewing.features ||
                    []
                  ).map(
                    (
                      feature,
                      index
                    ) => (
                      <li key={index}>
                        {feature}
                      </li>
                    )
                  )}
                </ul>
              </div>

              {/* Technologies */}

              <div>
                <h4 className="font-bold">
                  Technologies
                </h4>

                <p className="mt-1 text-gray-800 dark:text-gray-300">
                  {(
                    reviewing.technologies ||
                    []
                  ).join(", ")}
                </p>
              </div>
            </div>

            {/* Review Comment */}

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-semibold text-gray-900 dark:text-gray-200">
                Review Comment
              </span>

              <textarea
                value={
                  reviewComment
                }
                onChange={(
                  event
                ) =>
                  setReviewComment(
                    event.target.value
                  )
                }
                rows={4}
                placeholder="Write feedback for the employee..."
                className={
                  inputClass
                }
              />
            </label>

            {/* Review Actions */}

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={
                  reviewMutation.isPending
                }
                onClick={() => {
                  if (
                    !reviewComment.trim()
                  ) {
                    toast.warning(
                      "Enter feedback before requesting changes."
                    );

                    return;
                  }

                  reviewMutation.mutate({
                    id: reviewing._id,
                    decision:
                      "request_changes",
                    comment:
                      reviewComment,
                  });
                }}
                className="rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
              >
                Request Changes
              </button>

              <button
                type="button"
                disabled={
                  reviewMutation.isPending
                }
                onClick={() =>
                  reviewMutation.mutate({
                    id: reviewing._id,
                    decision:
                      "approve",
                    comment:
                      reviewComment,
                  })
                }
                className="rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50"
              >
                Approve Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
