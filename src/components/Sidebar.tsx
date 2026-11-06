import { NavLink } from "react-router-dom";

import {
  useInternalUnreadCount,
} from "../hooks/useInternalUnreadCount";

const links = [
  ["/admin", "Dashboard"],
  ["/admin/employees", "Employees"],
  ["/admin/jobs", "Jobs"],
  ["/admin/applications", "Applications"],
  ["/admin/leave", "Leave Management"],
  ["/admin/attendance", "Attendance"],
  ["/admin/tasks", "Tasks"],
  ["/admin/performance", "Performance"],
  ["/admin/announcements", "Announcements"],
  ["/admin/messages", "Messages"],
  ["/admin/team-messages", "Team Messages"],
  ["/admin/projects", "Projects"],
  ["/admin/activity-logs", "Activity History"],
  ["/admin/profile", "Profile"],
  ["/admin/settings", "Settings"],
];

interface SidebarProps {
  onItemClick?: () => void;
}

export default function Sidebar({
  onItemClick,
}: SidebarProps) {
  const { data: unreadCount = 0 } =
    useInternalUnreadCount();

  const linkClass = ({
    isActive,
  }: {
    isActive: boolean;
  }) =>
    `block w-full rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
      isActive
        ? "bg-indigo-600 text-white dark:bg-cyan-400 dark:text-black"
        : "text-gray-300 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <aside className="flex min-h-full w-full flex-col bg-[#172033] p-4 text-white md:w-[245px] md:p-6">
      <div className="shrink-0 px-3 pb-5 text-xl font-extrabold">
        Admin Panel
      </div>

      <nav
        className="flex flex-col gap-1"
        aria-label="Admin navigation"
      >
        {links.map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/admin"}
            className={linkClass}
            onClick={onItemClick}
          >
            <span className="flex items-center justify-between gap-2">
              <span>{label}</span>

              {to === "/admin/team-messages" &&
                unreadCount > 0 && (
                  <span className="min-w-5 rounded-full bg-red-600 px-2 py-0.5 text-center text-xs font-bold text-white">
                    {unreadCount > 99
                      ? "99+"
                      : unreadCount}
                  </span>
                )}
            </span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}