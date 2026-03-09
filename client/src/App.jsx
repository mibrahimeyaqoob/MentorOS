import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";

import ProtectedRoute from "./components/layout/ProtectedRoute";
import AdminLayout from "./components/layout/AdminLayout";

import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword"; // <-- Added this

import StudentDashboard from "./pages/student/StudentDashboard";

import Dashboard from "./pages/admin/Dashboard";
import CourseCreator from "./pages/admin/courses/CourseCreator";
import ApiManager from "./pages/admin/system/ApiManager";
import VectorBrain from "./pages/admin/system/VectorBrain";
import UsageAnalytics from "./pages/admin/system/UsageAnalytics";
import UserManagement from "./pages/admin/users/UserManagement";
import Profile from "./pages/admin/users/Profile";

export default function App() {
    return (
        <AuthProvider>
            <ToastProvider>
                <Router>
                    <Routes>
                        <Route path="/" element={<Navigate to="/login" replace />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} /> {/* <-- Added this */}

                        {/* Student Portal */}
                        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                            <Route path="/student/dashboard" element={<StudentDashboard />} />
                        </Route>

                        {/* HQ Admin Portal */}
                        <Route path="/hq-mentor-core" element={<ProtectedRoute allowedRoles={["admin", "creator", "super_admin"]} />}>
                            <Route element={<AdminLayout />}>
                                <Route index element={<Navigate to="dashboard" replace />} />

                                <Route path="dashboard" element={<Dashboard />} />
                                <Route path="profile" element={<Profile />} />

                                <Route path="course-creator" element={<CourseCreator />} />
                                <Route path="course-creator/:id" element={<CourseCreator />} />

                                <Route path="command-center" element={<ApiManager />} />
                                <Route path="vector-brain" element={<VectorBrain />} />
                                <Route path="usage" element={<UsageAnalytics />} />
                                <Route path="users" element={<UserManagement />} />
                            </Route>
                        </Route>

                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                </Router>
            </ToastProvider>
        </AuthProvider>
    );
}