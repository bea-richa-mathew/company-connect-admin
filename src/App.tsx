import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { ToastContainer } from "react-toastify";

import {
  AdminAuthProvider,
} from "./context/AdminAuthContext";

import {
  ThemeProvider,
} from "./context/ThemeContext";

import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Jobs from "./pages/Jobs";
import Applications from "./pages/Applications";
import Leave from "./pages/Leave";
import Attendance from "./pages/Attendance";
import Tasks from "./pages/Tasks";
import Announcements from "./pages/Announcements";
import Messages from "./pages/Messages";
import TeamMessages from "./pages/TeamMessages";
import Projects from "./pages/Projects";
import ActivityLogs from "./pages/ActivityLogs";
import Performance from "./pages/Performance";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AdminAuthProvider>
            <>
              <Routes>
                {/* Admin Login */}
                <Route
                  path="/login"
                  element={<Login />}
                />

                {/* Protected Admin Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route
                    path="/admin"
                    element={<AdminLayout />}
                  >
                    <Route
                      index
                      element={<Dashboard />}
                    />

                    <Route
                      path="projects"
                      element={<Projects />}
                    />

                    <Route
                      path="employees"
                      element={<Employees />}
                    />

                    <Route
                      path="jobs"
                      element={<Jobs />}
                    />

                    <Route
                      path="applications"
                      element={<Applications />}
                    />

                    <Route
                      path="leave"
                      element={<Leave />}
                    />

                    <Route
                      path="attendance"
                      element={<Attendance />}
                    />

                    <Route
                      path="tasks"
                      element={<Tasks />}
                    />

                    <Route
                      path="announcements"
                      element={<Announcements />}
                    />

                    {/* Existing Contact Form Messages */}
                    <Route
                      path="messages"
                      element={<Messages />}
                    />

                    {/* Internal Team Messaging */}
                    <Route
                      path="team-messages"
                      element={<TeamMessages />}
                    />

                    <Route
                      path="activity-logs"
                      element={<ActivityLogs />}
                    />

                    <Route
                      path="performance"
                      element={<Performance />}
                    />

                    <Route
                      path="profile"
                      element={<Profile />}
                    />

                    <Route
                      path="settings"
                      element={<Settings />}
                    />
                  </Route>
                </Route>

                {/* Redirect Unknown Routes */}
                <Route
                  path="*"
                  element={
                    <Navigate
                      to="/login"
                      replace
                    />
                  }
                />
              </Routes>

              {/* React Toastify Notifications */}
              <ToastContainer
                position="top-center"
                toastClassName="text-base"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick={false}
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
              />
            </>
          </AdminAuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}