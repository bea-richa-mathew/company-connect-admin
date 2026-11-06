export interface AdminUser {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: "admin" | "employee";
  employeeId?: string;
  department?: string;
  designation?: string;
  phone?: string;
  address?: string;
  joiningDate?: string;
  active?: boolean;
  profileImage?: string;
}

export interface Job {
  _id: string;
  title: string;
  department: string;
  location: string;
  type: "Full-time" | "Part-time" | "Internship" | "Contract";
  experience: string;
  description: string;
  skills: string[];
  deadline?: string | null;
  status: "Open" | "Closed";
  createdAt?: string;
  updatedAt?: string;
}

export interface Employee {
  _id: string;
  name: string;
  email: string;
  role: "employee" | "admin";
  employeeId?: string;
  department?: string;
  designation?: string;
  phone?: string;
  address?: string;
  joiningDate?: string;
  active: boolean;
  profileImage?: string;
  createdAt?: string;
}

export interface Application {
  _id: string;
  job: {
    _id: string;
    title: string;
    department?: string;
    location?: string;
  };
  applicantName: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  coverLetter?: string;
  status:
    | "Applied"
    | "Shortlisted"
    | "Interview"
    | "Selected"
    | "Rejected";
  createdAt: string;
}

export interface LeaveRequest {
  _id: string;
  id?: string;
  employee: {
    _id: string;
    name: string;
    email: string;
    employeeId?: string;
    department?: string;
  };
  leaveType?: string;
  type?: string;
  startDate?: string;
  from?: string;
  endDate?: string;
  to?: string;
  reason: string;
  status:
    | "Pending"
    | "Approved"
    | "Rejected";
  adminComment?: string;
  createdAt: string;
}

export interface Attendance {
  _id: string;
  employee: {
    _id: string;
    name: string;
    email: string;
    employeeId?: string;
    department?: string;
  };
  date: string;
  checkIn?: string;
  checkOut?: string;
  status:
    | "Present"
    | "Absent"
    | "Half Day";
}

export interface Task {
  _id: string;
  assignedTo: {
    _id: string;
    name: string;
    employeeId?: string;
    department?: string;
  };
  title: string;
  description?: string;
  dueDate?: string;
  priority: "Low" | "Medium" | "High";
  status:
    | "Pending"
    | "In Progress"
    | "Completed";
  createdAt: string;
}

export interface Announcement {
  _id: string;
  title: string;
  message: string;
  date: string;
  active: boolean;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
}

export interface DashboardData {
  employees: number;
  jobs: number;
  applications: number;
  pendingLeaves: number;
  attendance: number;
}

export interface StatsData {
  employees: number;
  activeEmployees: number;
  jobs: number;
  applications: number;
  pendingApplications: number;
  selectedApplications: number;
  pendingLeaves: number;
  approvedLeaves: number;
}