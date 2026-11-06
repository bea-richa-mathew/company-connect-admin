
import { useRef, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import axios from "axios";

import {
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";

import api from "../lib/api";

interface Attachment {
  _id: string;
  originalName: string;
  size: number;
  createdAt: string;
  uploadedBy?: {
    name: string;
  };
}

interface Props {
  taskId: string;
}

interface AttachmentResponse {
  success: boolean;
  data: Attachment[];
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".txt",
  ".docx",
  ".xlsx",
];

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const backendMessage =
      error.response?.data?.message;

    if (
      typeof backendMessage === "string" &&
      backendMessage.trim()
    ) {
      return backendMessage;
    }

    if (error.response?.status === 401) {
      return "Your admin session has expired. Please log in again.";
    }

    if (error.response?.status === 403) {
      return "You do not have permission to upload this file.";
    }

    if (error.response?.status === 404) {
      return "Attachment endpoint not found.";
    }

    if (error.response?.status === 413) {
      return "The file exceeds the server upload limit.";
    }

    return error.message || "File upload failed.";
  }

  return error instanceof Error
    ? error.message
    : "Something went wrong.";
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function TaskAttachments({
  taskId,
}: Props) {
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [downloadingId, setDownloadingId] =
    useState<string | null>(null);

  const queryKey = ["task-attachments", taskId];

  const attachmentsQuery = useQuery<AttachmentResponse>({
    queryKey,
    enabled: Boolean(taskId),

    queryFn: async () => {
      const response = await api.get<AttachmentResponse>(
        `/tasks/${taskId}/attachments`
      );

      return response.data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();

      // Must match uploadTaskAttachment.single("file")
      formData.append("file", file, file.name);

      const response = await api.post(
        `/tasks/${taskId}/attachments`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      return response.data;
    },

    onSuccess: async () => {
      setSelectedFile(null);
      setError("");
      setSuccess("File uploaded successfully.");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await queryClient.invalidateQueries({
        queryKey,
      });
    },

    onError: (error: unknown) => {
      setSuccess("");
      setError(getErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const response = await api.delete(
        `/tasks/${taskId}/attachments/${attachmentId}`
      );

      return response.data;
    },

    onSuccess: async () => {
      setError("");
      setSuccess("Attachment deleted successfully.");

      await queryClient.invalidateQueries({
        queryKey,
      });
    },

    onError: (error: unknown) => {
      setSuccess("");
      setError(getErrorMessage(error));
    },
  });

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    setError("");
    setSuccess("");

    const file = event.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const extension =
      file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ||
      "";

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setSelectedFile(null);
      setError("Unsupported file type.");

      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setError("Maximum file size is 5 MB.");

      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  function handleUpload() {
    setError("");
    setSuccess("");

    if (!selectedFile) {
      setError("Please select a file before uploading.");
      return;
    }

    if (!taskId) {
      setError("Task ID is missing.");
      return;
    }

    uploadMutation.mutate(selectedFile);
  }

  async function downloadAttachment(
    attachment: Attachment
  ) {
    setError("");
    setDownloadingId(attachment._id);

    let objectUrl: string | null = null;

    try {
      const response = await api.get(
        `/tasks/${taskId}/attachments/${attachment._id}/download`,
        {
          responseType: "blob",
        }
      );

      objectUrl = URL.createObjectURL(
        response.data as Blob
      );

      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = attachment.originalName;

      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      if (objectUrl) {
        const url = objectUrl;

        window.setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
      }

      setDownloadingId(null);
    }
  }

  const attachments =
    attachmentsQuery.data?.data ?? [];

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">
            Task Attachments
          </h3>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Upload files for the assigned employee.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void attachmentsQuery.refetch()}
          disabled={attachmentsQuery.isFetching}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          <RefreshCw
            size={15}
            className={
              attachmentsQuery.isFetching
                ? "animate-spin"
                : ""
            }
          />
          Refresh
        </button>
      </div>

      <div className="space-y-3 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 p-4 dark:border-indigo-500/30 dark:bg-indigo-500/5">
        <label
          htmlFor={`task-file-${taskId}`}
          className="block text-sm font-semibold"
        >
          Select Attachment
        </label>

        <input
          ref={fileInputRef}
          id={`task-file-${taskId}`}
          type="file"
          accept={ALLOWED_EXTENSIONS.join(",")}
          onChange={handleFileChange}
          className="block w-full min-w-0 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-4 file:py-2 file:font-semibold file:text-indigo-700 dark:text-slate-200 dark:file:bg-indigo-500/20 dark:file:text-indigo-300"
        />

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Supported: PDF, PNG, JPG, TXT, DOCX, XLSX.
          Maximum size: 5 MB.
        </p>

        {selectedFile && (
          <p className="break-all text-sm font-medium text-indigo-700 dark:text-indigo-300">
            Selected: {selectedFile.name}
            {" "}({formatSize(selectedFile.size)})
          </p>
        )}

        <button
          type="button"
          disabled={
            !selectedFile || uploadMutation.isPending
          }
          onClick={handleUpload}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploadMutation.isPending ? (
            <>
              <Loader2
                size={17}
                className="animate-spin"
              />
              Uploading...
            </>
          ) : (
            <>
              <Upload size={17} />
              Upload File
            </>
          )}
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
        >
          {success}
        </p>
      )}

      {attachmentsQuery.isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Loading attachments...
        </p>
      ) : attachmentsQuery.isError ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          {getErrorMessage(attachmentsQuery.error)}
        </p>
      ) : attachments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
          No attachments uploaded yet.
        </div>
      ) : (
        <div className="space-y-3">
          {attachments.map((attachment) => (
            <div
              key={attachment._id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700"
            >
              <div className="flex min-w-0 items-center gap-3">
                <FileText
                  size={22}
                  className="shrink-0 text-indigo-600 dark:text-indigo-400"
                />

                <div className="min-w-0">
                  <p className="break-all text-sm font-semibold">
                    {attachment.originalName}
                  </p>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {formatSize(attachment.size)}
                    {attachment.uploadedBy?.name
                      ? ` · ${attachment.uploadedBy.name}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={
                    downloadingId === attachment._id
                  }
                  onClick={() =>
                    void downloadAttachment(attachment)
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <Download size={15} />
                  Download
                </button>

                <button
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete ${attachment.originalName}?`
                      )
                    ) {
                      deleteMutation.mutate(
                        attachment._id
                      );
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <Trash2 size={15} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
