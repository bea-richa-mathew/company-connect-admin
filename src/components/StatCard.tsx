import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: StatCardProps) {
  return (
    <div className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-admin-border dark:bg-admin-card dark:shadow-none dark:hover:border-gray-600 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>

          <p className="mt-3 break-words text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {value}
          </p>
        </div>

        <div className="shrink-0 rounded-xl bg-indigo-50 p-3 text-indigo-600 transition-colors dark:bg-indigo-500/15 dark:text-indigo-400">
          <Icon size={22} />
        </div>
      </div>

      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        {subtitle}
      </p>
    </div>
  );
}