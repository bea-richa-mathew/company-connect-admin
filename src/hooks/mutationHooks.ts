
import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";

import {
  queryKeys,
} from "./queryHooks";

import {
  setEmployeeActive,
  createTask,
  updateTask,
  reviewLeave,
  saveJob,
  deleteJob,
  saveAnnouncement,
  deleteAnnouncement,
  saveProject,
  deleteProject,
  publishProject,
  setProjectPermission,
  removeProjectEmployee,
  reviewProject,
} from "../api/apiServices";

type MutationFn<V> = (
  input: V
) => Promise<unknown>;

type MutationCallbacks<V> = Pick<
  UseMutationOptions<unknown, Error, V>,
  "onSuccess" | "onError"
>;

// Shared mutation helper.
// Automatically refreshes related queries.
function useAdminMutation<V>(
  fn: MutationFn<V>,
  keys: readonly (readonly string[])[],
  options?: MutationCallbacks<V>
) {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, V>({
    mutationFn: fn,

    onSuccess: async (
      data,
      variables,
      onMutateResult,
      context
    ) => {
      await Promise.all(
        keys.map((queryKey) =>
          queryClient.invalidateQueries({
            queryKey,
          })
        )
      );

      await options?.onSuccess?.(
        data,
        variables,
        onMutateResult,
        context
      );
    },

    onError: options?.onError,
  });
}

// ===========================
// EMPLOYEES
// ===========================

export function useEmployeeActiveMutation(
  options?: MutationCallbacks<
    Parameters<typeof setEmployeeActive>[0]
  >
) {
  return useAdminMutation(
    setEmployeeActive,
    [
      queryKeys.employees,
      queryKeys.dashboard,
    ],
    options
  );
}

// ===========================
// TASKS
// ===========================

export function useCreateTaskMutation(
  options?: MutationCallbacks<
    Parameters<typeof createTask>[0]
  >
) {
  return useAdminMutation(
    createTask,
    [
      queryKeys.tasks,
      queryKeys.dashboard,
    ],
    options
  );
}

export function useUpdateTaskMutation(
  options?: MutationCallbacks<
    Parameters<typeof updateTask>[0]
  >
) {
  return useAdminMutation(
    updateTask,
    [
      queryKeys.tasks,
      queryKeys.dashboard,
    ],
    options
  );
}

// ===========================
// LEAVES
// ===========================

export function useReviewLeaveMutation(
  options?: MutationCallbacks<
    Parameters<typeof reviewLeave>[0]
  >
) {
  return useAdminMutation(
    reviewLeave,
    [
      queryKeys.leaves,
      queryKeys.dashboard,
      queryKeys.stats,
    ],
    options
  );
}

// ===========================
// JOBS
// ===========================

export function useSaveJobMutation(
  options?: MutationCallbacks<
    Parameters<typeof saveJob>[0]
  >
) {
  return useAdminMutation(
    saveJob,
    [
      queryKeys.jobs,
      queryKeys.dashboard,
    ],
    options
  );
}

export function useDeleteJobMutation(
  options?: MutationCallbacks<string>
) {
  return useAdminMutation(
    deleteJob,
    [
      queryKeys.jobs,
      queryKeys.dashboard,
    ],
    options
  );
}

// ===========================
// ANNOUNCEMENTS
// ===========================

export function useSaveAnnouncementMutation(
  options?: MutationCallbacks<
    Parameters<typeof saveAnnouncement>[0]
  >
) {
  return useAdminMutation(
    saveAnnouncement,
    [queryKeys.announcements],
    options
  );
}

export function useDeleteAnnouncementMutation(
  options?: MutationCallbacks<string>
) {
  return useAdminMutation(
    deleteAnnouncement,
    [queryKeys.announcements],
    options
  );
}

// ===========================
// PROJECTS
// ===========================

export function useSaveProjectMutation(
  options?: MutationCallbacks<
    Parameters<typeof saveProject>[0]
  >
) {
  return useAdminMutation(
    saveProject,
    [queryKeys.projects],
    options
  );
}

export function useDeleteProjectMutation(
  options?: MutationCallbacks<string>
) {
  return useAdminMutation(
    deleteProject,
    [queryKeys.projects],
    options
  );
}

export function usePublishProjectMutation(
  options?: MutationCallbacks<string>
) {
  return useAdminMutation(
    publishProject,
    [queryKeys.projects],
    options
  );
}

export function useProjectPermissionMutation(
  options?: MutationCallbacks<
    Parameters<typeof setProjectPermission>[0]
  >
) {
  return useAdminMutation(
    setProjectPermission,
    [queryKeys.projects],
    options
  );
}

export function useRemoveProjectEmployeeMutation(
  options?: MutationCallbacks<
    Parameters<typeof removeProjectEmployee>[0]
  >
) {
  return useAdminMutation(
    removeProjectEmployee,
    [queryKeys.projects],
    options
  );
}

export function useReviewProjectMutation(
  options?: MutationCallbacks<
    Parameters<typeof reviewProject>[0]
  >
) {
  return useAdminMutation(
    reviewProject,
    [queryKeys.projects],
    options
  );
}
