
import { useQuery } from "@tanstack/react-query";

import {
  fetchPerformance,
  fetchAttendance,
  fetchDashboard,
  fetchStats,
  fetchEmployees,
  fetchProjectEmployees,
  fetchJobs,
  fetchTasks,
  fetchLeaves,
  fetchProjects,
  fetchAnnouncements,
  fetchContactMessages,
} from "../api/apiServices";

// QUERY KEYS


export const queryKeys = {
  performance: ["employee-performance"] as const,

  attendance: ["admin-attendance"] as const,

  dashboard: ["admin-dashboard"] as const,

  stats: ["admin-stats"] as const,

  employees: ["employees"] as const,

  projectEmployees: ["project-employees"] as const,

  jobs: ["admin-jobs"] as const,

  tasks: ["tasks"] as const,

  leaves: ["admin-leaves"] as const,

  projects: ["admin-projects"] as const,

  announcements: ["announcements"] as const,

  messages: ["contact-messages"] as const,
};

// PERFORMANCE

export function usePerformanceQuery() {
  return useQuery({
    queryKey: queryKeys.performance,
    queryFn: fetchPerformance,
  });
}

// ATTENDANCE

export function useAttendanceQuery() {
  return useQuery({
    queryKey: queryKeys.attendance,
    queryFn: fetchAttendance,
  });
}

// DASHBOARD

export function useDashboardQuery() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: fetchDashboard,
  });
}

// ADMIN STATISTICS

export function useStatsQuery() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: fetchStats,
  });
}

export function useEmployeesQuery() {
  return useQuery({
    queryKey: queryKeys.employees,
    queryFn: fetchEmployees,
  });
}

export function useProjectEmployeesQuery() {
  return useQuery({
    queryKey: queryKeys.projectEmployees,
    queryFn: fetchProjectEmployees,
  });
}

export function useJobsQuery() {
  return useQuery({
    queryKey: queryKeys.jobs,
    queryFn: fetchJobs,
  });
}

export function useTasksQuery() {
  return useQuery({
    queryKey: queryKeys.tasks,
    queryFn: fetchTasks,
  });
}

export function useLeavesQuery() {
  return useQuery({
    queryKey: queryKeys.leaves,
    queryFn: fetchLeaves,

    refetchOnWindowFocus: true,
  });
}

export function useProjectsQuery() {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: fetchProjects,

    refetchInterval: 5000,

    refetchOnWindowFocus: true,

    refetchOnMount: "always",

    staleTime: 0,
  });
}

export function useAnnouncementsQuery() {
  return useQuery({
    queryKey: queryKeys.announcements,
    queryFn: fetchAnnouncements,
  });
}

export function useContactMessagesQuery() {
  return useQuery({
    queryKey: queryKeys.messages,
    queryFn: fetchContactMessages,

    refetchOnWindowFocus: true,
  });
}
