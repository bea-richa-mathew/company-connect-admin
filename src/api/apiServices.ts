
import api from "../lib/api";

import type {
  Announcement,
  Employee,
  Job,
  Task,
  Attendance,
} from "../types";

import type {
  Project,
  ProjectStatus,
  ApiResponse,
} from "../types/project";

export type EmployeeWithPhoto = Employee & {
  isActive?: boolean;
  active?: boolean;
};

export interface PerformanceItem {
  employee: {
    _id: string;
    name: string;
    email: string;
    employeeId?: string;
    department?: string;
  };
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completionRate: number;
}

export interface DashboardOverview {
  totalEmployees: number;
  activeEmployees: number;
  totalJobs: number;
  openJobs: number;
  totalApplications: number;
  pendingLeaves: number;
  todayAttendance: number;
  pendingTasks: number;
  newMessages: number;
}

export interface GroupCount {
  _id: string | null;
  count: number;
}

export interface DashboardStats {
  applicationsByStatus: GroupCount[];
  employeesByDepartment: GroupCount[];
  attendanceByStatus: GroupCount[];
  leavesByStatus: GroupCount[];
}

export interface AdminLeave {
  _id: string;
  employee?:
    | {
        _id?: string;
        name?: string;
        email?: string;
        employeeId?: string;
      }
    | string
    | null;
  leaveType?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
  status: "Pending" | "Approved" | "Rejected";
  adminComment?: string;
  createdAt?: string;
}

export interface ProjectEmployeeOption {
  _id: string;
  name: string;
  email: string;
  employeeId?: string;
  role?: string;
}

export interface JobForm {
  title: string;
  department: string;
  location: string;
  type: Job["type"];
  experience: string;
  description: string;
  skills: string;
  deadline: string;
}

export interface ProjectForm {
  title: string;
  slug: string;
  category: string;
  description: string;
  summary: string;
  problem: string;
  solution: string;
  features: string;
  technologies: string;
  imageUrl: string;
  projectUrl: string;
  status: ProjectStatus;
}

export type ProjectReview = {
  id: string;
  decision: "approve" | "request_changes";
  comment: string;
};

export type ProjectPermission = {
  projectId: string;
  employeeId: string;
  canEdit: boolean;
};

export type ProjectEmployeeRemoval = {
  projectId: string;
  employeeId: string;
};

export type TaskCreate = {
  assignedTo: string;
  title: string;
  description: string;
  dueDate?: string;
  priority: Task["priority"];
};

export type TaskUpdate = {
  id: string;
  status: Task["status"];
};

export type LeaveReview = {
  id: string;
  status: "Approved" | "Rejected";
};

// ===========================
// PERFORMANCE
// ===========================

export async function fetchPerformance(): Promise<
  PerformanceItem[]
> {
  const response = await api.get<{
    data: PerformanceItem[];
  }>("/performance");

  return response.data.data ?? [];
}

// ===========================
// ATTENDANCE
// ===========================

export async function fetchAttendance(): Promise<
  Attendance[]
> {
  const response = await api.get<{
    data?: Attendance[];
    attendance?: Attendance[];
  }>("/attendance");

  return (
    response.data.data ??
    response.data.attendance ??
    []
  );
}

// ===========================
// DASHBOARD
// ===========================

export async function fetchDashboard(): Promise<
  DashboardOverview
> {
  const response = await api.get<
    ApiResponse<DashboardOverview>
  >("/admin/dashboard");

  return response.data.data;
}

export async function fetchStats(): Promise<
  DashboardStats
> {
  const response = await api.get<
    ApiResponse<DashboardStats>
  >("/admin/stats");

  return response.data.data;
}

// ===========================
// EMPLOYEES
// ===========================

export async function fetchEmployees(): Promise<
  EmployeeWithPhoto[]
> {
  const response = await api.get("/employees");
  const body = response.data;

  if (
    body?.success &&
    Array.isArray(body.data)
  ) {
    return body.data;
  }

  if (Array.isArray(body)) {
    return body;
  }

  throw new Error(
    "Invalid employee response received from the backend."
  );
}

export async function fetchProjectEmployees(): Promise<
  ProjectEmployeeOption[]
> {
  const response = await api.get("/employees");
  const body = response.data;

  const raw =
    body.data?.employees ??
    body.employees ??
    body.data ??
    [];

  if (!Array.isArray(raw)) {
    throw new Error(
      "Unexpected employee response."
    );
  }

  return raw.filter(
    (employee: ProjectEmployeeOption) =>
      !employee.role ||
      employee.role === "employee"
  );
}

export async function setEmployeeActive({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const response = await api.patch(
    `/employees/${id}`,
    { isActive: active }
  );

  return response.data;
}

// ===========================
// JOBS
// ===========================

export async function fetchJobs() {
  const response = await api.get<{
    success: boolean;
    data: Job[];
  }>("/jobs?all=true");

  return response.data;
}

export async function saveJob({
  form,
  id,
}: {
  form: JobForm;
  id?: string;
}) {
  const payload = {
    ...form,
    skills: form.skills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean),
    deadline: form.deadline || undefined,
  };

  const response = id
    ? await api.patch(`/jobs/${id}`, payload)
    : await api.post("/jobs", payload);

  return response.data;
}

export async function deleteJob(id: string) {
  const response = await api.delete(
    `/jobs/${id}`
  );

  return response.data;
}

// ===========================
// TASKS
// ===========================

export async function fetchTasks() {
  const response = await api.get<{
    success: boolean;
    data: Task[];
  }>("/tasks");

  return response.data;
}

export async function createTask(
  payload: TaskCreate
) {
  const response = await api.post(
    "/tasks",
    payload
  );

  return response.data;
}

export async function updateTask({
  id,
  status,
}: TaskUpdate) {
  const response = await api.patch(
    `/tasks/${id}`,
    { status }
  );

  return response.data;
}

// ===========================
// LEAVE MANAGEMENT
// ===========================

export async function fetchLeaves(): Promise<
  AdminLeave[]
> {
  const response = await api.get<{
    data: AdminLeave[];
  }>("/leaves");

  return response.data.data ?? [];
}

export async function reviewLeave({
  id,
  status,
}: LeaveReview) {
  const response = await api.patch(
    `/leaves/${id}/review`,
    { status }
  );

  return response.data;
}

// ===========================
// PROJECTS
// ===========================

export async function fetchProjects(): Promise<
  Project[]
> {
  const response = await api.get<
    ApiResponse<Project[]>
  >("/projects/admin");

  return response.data.data;
}

export async function saveProject({
  form,
  id,
}: {
  form: ProjectForm;
  id?: string;
}) {
  const payload = {
    ...form,
    features: form.features
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean),
    technologies: form.technologies
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean),
  };

  const response = id
    ? await api.patch(
        `/projects/admin/${id}`,
        payload
      )
    : await api.post(
        "/projects/admin",
        payload
      );

  return response.data;
}

export async function deleteProject(
  id: string
) {
  const response = await api.delete(
    `/projects/admin/${id}`
  );

  return response.data;
}

export async function publishProject(
  id: string
) {
  const response = await api.patch(
    `/projects/admin/${id}`,
    { isPublished: true }
  );

  return response.data;
}

export async function setProjectPermission({
  projectId,
  employeeId,
  canEdit,
}: ProjectPermission) {
  const response = await api.patch(
    `/projects/admin/${projectId}/permissions`,
    {
      employeeId,
      canEdit,
    }
  );

  return response.data;
}

export async function removeProjectEmployee({
  projectId,
  employeeId,
}: ProjectEmployeeRemoval) {
  const response = await api.delete(
    `/projects/admin/${projectId}/employees/${employeeId}`
  );

  return response.data;
}

export async function reviewProject({
  id,
  decision,
  comment,
}: ProjectReview) {
  const response = await api.patch(
    `/projects/admin/${id}/review`,
    {
      decision,
      comment,
    }
  );

  return response.data;
}

// ===========================
// ANNOUNCEMENTS
// ===========================

export async function fetchAnnouncements(): Promise<
  Announcement[]
> {
  const response = await api.get(
    "/announcements"
  );

  const body = response.data;

  return (
    body.announcements ??
    body.data?.announcements ??
    body.data ??
    []
  );
}

export async function saveAnnouncement({
  id,
  title,
  message,
}: {
  id?: string;
  title: string;
  message: string;
}) {
  const payload = { title, message };

  const response = id
    ? await api.patch(
        `/announcements/${id}`,
        payload
      )
    : await api.post(
        "/announcements",
        payload
      );

  return response.data;
}

export async function deleteAnnouncement(
  id: string
) {
  const response = await api.delete(
    `/announcements/${id}`
  );

  return response.data;
}

// ===========================
// ADMIN AUTHENTICATION
// ===========================

export async function fetchAdminSession() {
  const response = await api.get("/auth/me");
  return response.data;
}

export async function loginAdmin(
  email: string,
  password: string
) {
  const response = await api.post(
    "/auth/login",
    {
      email,
      password,
    }
  );

  return response.data;
}

export async function logoutAdmin() {
  const response = await api.post(
    "/auth/logout"
  );

  return response.data;
}
export interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  message: string;
  status: string;
  createdAt: string;
}

export async function fetchContactMessages(): Promise<
  ContactMessage[]
> {
  const response = await api.get<{
    success: boolean;
    data: ContactMessage[];
  }>("/contact");

  return response.data.data ?? [];
}