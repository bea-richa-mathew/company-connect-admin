interface StatusBadgeProps {
  value: string;
}

export default function StatusBadge({
  value
}: StatusBadgeProps) {
  const normalized =
    value
      .toLowerCase()
      .replace(/\s+/g, "-");

  const styles: Record<
    string,
    string
  > = {
    approved:
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",

    completed:
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",

    selected:
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",

    present:
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",

    active:
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",

    pending:
      "bg-amber-500/10 text-amber-400 border-amber-500/20",

    applied:
      "bg-amber-500/10 text-amber-400 border-amber-500/20",

    "in-progress":
      "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",

    interview:
      "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",

    shortlisted:
      "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",

    rejected:
      "bg-red-500/10 text-red-400 border-red-500/20",

    absent:
      "bg-red-500/10 text-red-400 border-red-500/20",

    inactive:
      "bg-red-500/10 text-red-400 border-red-500/20",

    high:
      "bg-red-500/10 text-red-400 border-red-500/20",

    medium:
      "bg-amber-500/10 text-amber-400 border-amber-500/20",

    low:
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",

    "half-day":
      "bg-orange-500/10 text-orange-400 border-orange-500/20"
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
        styles[normalized] ??
        "border-admin-border bg-white/5 text-gray-300"
      }`}
    >
      {value}
    </span>
  );
}