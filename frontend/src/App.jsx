import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { SocketProvider } from "./context/SocketContext";
import { SessionProvider } from "./context/SessionContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Attendance from "./pages/Attendance";
import Employees from "./pages/Employees";
import InactivityMonitoring from "./pages/InactivityMonitoring";
import FieldMeetingsReview from "./pages/FieldMeetingsReview";
import MyFieldMeetings from "./pages/MyFieldMeetings";
import Settings from "./pages/Settings";
import Departments from "./pages/Departments";
import Profile from "./pages/Profile";
import Layout from "./components/Layout";

// Protected Route Wrapper with strict Role-Based Access Control
const ProtectedRoute = ({ children, adminOnly = false }) => {
    const userInfo = localStorage.getItem("userInfo")
        ? JSON.parse(localStorage.getItem("userInfo"))
        : null;

    if (!userInfo || !userInfo.token) {
        return <Navigate to="/login" replace />;
    }

    if (adminOnly && userInfo.role !== "admin" && userInfo.role !== "manager") {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

// Wrapper for SocketProvider with user data
const SocketWrapper = ({ children }) => {
    const userInfo = localStorage.getItem("userInfo")
        ? JSON.parse(localStorage.getItem("userInfo"))
        : null;
    return <SocketProvider user={userInfo}>{children}</SocketProvider>;
};

function App() {
    return (
        <Router>
            <SessionProvider>
                <Toaster
                    position="top-right"
                    reverseOrder={false}
                    toastOptions={{
                        duration: 4000,
                        style: {
                            borderRadius: "16px",
                            background: "#0f172a",
                            color: "#fff",
                            fontSize: "13px",
                            fontWeight: "bold",
                        },
                    }}
                />
                <Routes>
                    {/* Public Login Routes */}
                    <Route path="/login" element={<Login role="employee" />} />
                    <Route path="/admin/login" element={<Login role="admin" />} />

                    {/* Authenticated Routes inside Corporate Layout */}
                    <Route
                        path="/*"
                        element={
                            <ProtectedRoute>
                                <SocketWrapper>
                                    <Layout>
                                        <Routes>
                                            {/* Common Routes */}
                                            <Route path="/dashboard" element={<Dashboard />} />
                                            <Route path="/attendance" element={<Attendance />} />
                                            <Route path="/profile" element={<Profile />} />

                                            {/* Employee-Only Route */}
                                            <Route path="/my-meetings" element={<MyFieldMeetings />} />

                                            {/* Admin-Only Routes */}
                                            <Route
                                                path="/employees"
                                                element={
                                                    <ProtectedRoute adminOnly={true}>
                                                        <Employees />
                                                    </ProtectedRoute>
                                                }
                                            />
                                            <Route
                                                path="/inactivity-monitoring"
                                                element={
                                                    <ProtectedRoute adminOnly={true}>
                                                        <InactivityMonitoring />
                                                    </ProtectedRoute>
                                                }
                                            />
                                            <Route
                                                path="/field-meetings"
                                                element={
                                                    <ProtectedRoute adminOnly={true}>
                                                        <FieldMeetingsReview />
                                                    </ProtectedRoute>
                                                }
                                            />
                                            <Route
                                                path="/departments"
                                                element={
                                                    <ProtectedRoute adminOnly={true}>
                                                        <Departments />
                                                    </ProtectedRoute>
                                                }
                                            />
                                            <Route
                                                path="/settings"
                                                element={
                                                    <ProtectedRoute adminOnly={true}>
                                                        <Settings />
                                                    </ProtectedRoute>
                                                }
                                            />

                                            {/* Catch-all */}
                                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                        </Routes>
                                    </Layout>
                                </SocketWrapper>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </SessionProvider>
        </Router>
    );
}

export default App;
