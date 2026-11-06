
import { useMemo, useState } from "react";
import {
  Search,
  Eye,
  Power,
  X,
  Mail,
  Phone,
  Building2,
  CalendarDays,
  UserRound,
  RefreshCw,
  Users,
  MapPin,
  BriefcaseBusiness,
  AlertCircle,
} from "lucide-react";

import axios from "axios";
import { toast } from "react-toastify";

import {
  useEmployeesQuery,
} from "../hooks/queryHooks";

import {
  useEmployeeActiveMutation,
} from "../hooks/mutationHooks";

import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";

import type {
  EmployeeWithPhoto,
} from "../api/apiServices";

function getActive(employee: EmployeeWithPhoto) {
  return employee.isActive ?? employee.active ?? true;
}

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      (error.response
        ? `Request failed (${error.response.status}).`
        : "Unable to connect to the server.")
    );
  }

  return error instanceof Error
    ? error.message
    : "Something went wrong.";
}

function EmployeeAvatar({
  employee,
  size = "normal",
}: {
  employee: EmployeeWithPhoto;
  size?: "normal" | "large";
}) {
  const sizeClass =
    size === "large"
      ? "h-16 w-16 text-2xl"
      : "h-11 w-11 text-sm";

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white ${sizeClass}`}
    >
      {employee.profileImage ? (
        <img
          src={employee.profileImage}
          alt={`${employee.name} profile`}
          className="h-full w-full object-cover"
        />
      ) : (
        employee.name?.charAt(0).toUpperCase() || "U"
      )}
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-[#252936] dark:bg-[#08090d]">
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
        <Icon size={14} className="text-indigo-500" />
        {label}
      </div>

      <p className="mt-2 break-words text-sm font-semibold text-gray-900 dark:text-white">
        {value || "—"}
      </p>
    </div>
  );
}

export default function Employees() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] =
    useState<EmployeeWithPhoto | null>(null);

  const employeesQuery = useEmployeesQuery();

  const updateMutation = useEmployeeActiveMutation({
    onSuccess: () => {
      toast.success("Employee status updated successfully.");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const employees = employeesQuery.data ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const text = [
        employee.name,
        employee.email,
        employee.employeeId,
        employee.department,
        employee.designation,
        employee.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(term);
    });
  }, [employees, search]);

  const totalEmployees = employees.length;

  const activeEmployees = employees.filter(
    getActive
  ).length;

  const inactiveEmployees =
    totalEmployees - activeEmployees;

  const selectedEmployee = selected
    ? employees.find(
        (employee) => employee._id === selected._id
      ) ?? selected
    : null;

  async function refreshEmployees() {
    try {
      const result = await employeesQuery.refetch();

      if (result.isError) {
        throw result.error;
      }

      toast.success("Employee list refreshed.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function toggleActive(employee: EmployeeWithPhoto) {
    const currentlyActive = getActive(employee);

    const confirmed = window.confirm(
      currentlyActive
        ? `Deactivate ${employee.name}'s account?`
        : `Activate ${employee.name}'s account?`
    );

    if (!confirmed) return;

    updateMutation.mutate({
      id: employee._id,
      active: !currentlyActive,
    });
  }

  const columns = [
    {
      key: "employee",
      header: "Employee",
      render: (employee: EmployeeWithPhoto) => (
        <div className="flex items-center gap-3">
          <EmployeeAvatar employee={employee} />

          <div>
            <p className="font-semibold text-gray-900 dark:text-white">
              {employee.name}
            </p>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              {employee.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "employeeId",
      header: "Employee ID",
      render: (employee: EmployeeWithPhoto) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {employee.employeeId || "—"}
        </span>
      ),
    },
    {
      key: "department",
      header: "Department",
      render: (employee: EmployeeWithPhoto) => (
        <div>
          <p className="text-gray-800 dark:text-gray-200">
            {employee.department || "—"}
          </p>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            {employee.designation || ""}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (employee: EmployeeWithPhoto) => (
        <StatusBadge
          value={
            getActive(employee) ? "Active" : "Inactive"
          }
        />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (employee: EmployeeWithPhoto) => (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelected(employee)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <Eye size={15} />
            Details
          </button>

          <button
            type="button"
            disabled={updateMutation.isPending}
            onClick={() => toggleActive(employee)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 ${
              getActive(employee)
                ? "bg-red-600 hover:bg-red-500"
                : "bg-emerald-600 hover:bg-emerald-500"
            }`}
          >
            <Power size={14} />
            {getActive(employee)
              ? "Deactivate"
              : "Activate"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            Employee Management
          </p>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Employees
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            View employee information and manage account access.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refreshEmployees()}
          disabled={employeesQuery.isFetching}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <RefreshCw
            size={16}
            className={
              employeesQuery.isFetching
                ? "animate-spin"
                : ""
            }
          />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total Employees",
            value: totalEmployees,
            icon: Users,
          },
          {
            label: "Active Employees",
            value: activeEmployees,
            icon: UserRound,
          },
          {
            label: "Inactive Employees",
            value: inactiveEmployees,
            icon: AlertCircle,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-[#252936] dark:bg-[#101218]"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <item.icon size={20} />
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {item.label}
                </p>

                <h2 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {item.value}
                </h2>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />

        <input
          type="text"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search name, email, ID, department..."
          className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-[#101218] dark:text-white"
        />
      </div>

      {/* Errors */}
      {employeesQuery.isError && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {getErrorMessage(employeesQuery.error)}
        </div>
      )}

      {/* Employee Table */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#252936] dark:bg-[#101218] sm:p-6">
        <div className="mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Employee Directory
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {filtered.length} employee(s) found
          </p>
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          loading={employeesQuery.isLoading}
          emptyMessage="No employees found."
        />
      </div>

      {/* Employee Details Modal */}
      {selectedEmployee && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Employee details"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 text-gray-900 shadow-2xl dark:bg-[#14161e] dark:text-white"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <EmployeeAvatar
                  employee={selectedEmployee}
                  size="large"
                />

                <div>
                  <h2 className="text-2xl font-bold">
                    {selectedEmployee.name}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {selectedEmployee.designation ||
                      "Employee"}
                  </p>

                  <div className="mt-2">
                    <StatusBadge
                      value={
                        getActive(selectedEmployee)
                          ? "Active"
                          : "Inactive"
                      }
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                aria-label="Close employee details"
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <Detail
                icon={Mail}
                label="Email"
                value={selectedEmployee.email}
              />

              <Detail
                icon={UserRound}
                label="Employee ID"
                value={selectedEmployee.employeeId || "—"}
              />

              <Detail
                icon={Building2}
                label="Department"
                value={selectedEmployee.department || "—"}
              />

              <Detail
                icon={BriefcaseBusiness}
                label="Designation"
                value={selectedEmployee.designation || "—"}
              />

              <Detail
                icon={Phone}
                label="Phone"
                value={selectedEmployee.phone || "—"}
              />

              <Detail
                icon={MapPin}
                label="Address"
                value={selectedEmployee.address || "—"}
              />

              <Detail
                icon={CalendarDays}
                label="Joining Date"
                value={
                  selectedEmployee.joiningDate
                    ? new Date(
                        selectedEmployee.joiningDate
                      ).toLocaleDateString()
                    : "—"
                }
              />

              <Detail
                icon={UserRound}
                label="Role"
                value={selectedEmployee.role}
              />
            </div>

            <div className="mt-7 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold dark:border-gray-700"
              >
                Close
              </button>

              <button
                type="button"
                disabled={updateMutation.isPending}
                onClick={() =>
                  toggleActive(selectedEmployee)
                }
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
                  getActive(selectedEmployee)
                    ? "bg-red-600 hover:bg-red-500"
                    : "bg-emerald-600 hover:bg-emerald-500"
                }`}
              >
                {getActive(selectedEmployee)
                  ? "Deactivate Employee"
                  : "Activate Employee"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
