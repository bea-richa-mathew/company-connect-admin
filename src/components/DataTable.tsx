import type { ReactNode } from "react";

interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
}

export default function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage = "No records found.",
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-admin-border dark:bg-admin-card dark:shadow-none">
      <div className="overflow-x-auto">
        <table className="mobile-table w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-admin-border dark:bg-admin-bg">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 dark:divide-admin-border">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center"
                >
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-600 dark:border-admin-border dark:border-t-admin-primary" />
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    Loading records...
                  </p>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={
                    (item as { _id?: string })._id ??
                    index
                  }
                  className="bg-white transition-colors hover:bg-gray-50 dark:bg-admin-card dark:hover:bg-gray-800/60"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300"
                    >
                      {column.render(item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}