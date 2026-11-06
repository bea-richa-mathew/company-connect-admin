export type ProjectStatus =
  | "Planning"
  | "In Progress"
  | "Completed"
  | "On Hold";

export type ProjectReviewStatus =
  | "Not Submitted"
  | "Pending Review"
  | "Approved"
  | "Changes Requested";

export interface ProjectEmployee {
  employee: {
    _id: string;
    name: string;
    email: string;
    employeeId?: string;
    department?: string;
  };
  canEdit: boolean;
}

export interface Project {
  _id: string;
  title: string;
  slug: string;
  category: string;
  description: string;
  summary: string;
  problem: string;
  solution: string;
  features: string[];
  technologies: string[];
  imageUrl: string;
  projectUrl: string;
  status: ProjectStatus;
  reviewStatus?: ProjectReviewStatus;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  reviewComment?: string;
  isPublished: boolean;
  publishedSlug?: string | null;
  publishedSnapshot?: Record<string, unknown> | null;
  assignedEmployees?: ProjectEmployee[];
  canEdit?: boolean;
  isAssigned?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}