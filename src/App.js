import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  Outlet,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import ChatPage from "./pages/ChatPage";
import KnowledgeBasePage from "./pages/KnowledgeBasePage";
import UploadPage from "./pages/UploadPage";
import SharePointPage from "./pages/SharePointPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import AdminPage from "./pages/AdminPage";
import VoiceAssistantPage from "./pages/VoiceAssistantPage";  
import DashboardPage from "./pages/DashboardPage";  

import "./App.css";

// ------------------------
// ROUTE GUARDS
// ------------------------

function AuthLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function RequireAuth() {
  const { loading } = useAuth();
  const location = useLocation();

  if (loading) return <AuthLoading />;

  if (!sessionStorage.getItem("token")) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

function GuestOnly() {
  const { loading } = useAuth();

  if (loading) return <AuthLoading />;

  if (sessionStorage.getItem("token")) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function RequireAdmin() {
  const { permissions, loading } = useAuth();

  if (loading) return <AuthLoading />;

  if (!permissions.includes("manage_users")) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <span className="text-3xl">🚫</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            No Access
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            You don't have permission to access the Admin Panel.
            Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

// ------------------------
// APP
// ------------------------
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* GUEST ROUTES */}
          <Route element={<GuestOnly />}>
            <Route path="/login"  element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Route>

          {/* PROTECTED ROUTES */}
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>

              <Route path="/"               element={<ChatPage />} />
              <Route path="/voice"          element={<VoiceAssistantPage />} />  {/* ← NEW */}
              <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
              <Route path="/upload"         element={<UploadPage />} />
              <Route path="/sharepoint"     element={<SharePointPage />} />

              {/* ADMIN ONLY */}
              <Route element={<RequireAdmin />}>
                <Route path="/dashboard" element={<DashboardPage />} />  {/* ← NEW */}
                <Route path="/admin"     element={<AdminPage />} />
              </Route>

            </Route>
          </Route>

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;