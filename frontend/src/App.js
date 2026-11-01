import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth, profileComplete } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import Welcome from "@/pages/Welcome";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AuthCallback from "@/pages/AuthCallback";
import CompleteProfile from "@/pages/CompleteProfile";
import Dashboard from "@/pages/Dashboard";
import Pathway from "@/pages/Pathway";
import Tasks from "@/pages/Tasks";
import Lesson from "@/pages/Lesson";
import Prompts from "@/pages/Prompts";
import Profile from "@/pages/Profile";
import Privacy from "@/pages/Privacy";
import Guidance from "@/pages/Guidance";
import Admin from "@/pages/Admin";
import AdminLessonEdit from "@/pages/AdminLessonEdit";
import AdminPassword from "@/pages/AdminPassword";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import VerifyEmail from "@/pages/VerifyEmail";
import { saveReturn } from "@/lib/returnTo";

function Loading() {
  return <div className="p-10 text-center text-[var(--muted)]" data-testid="page-loading">Loading…</div>;
}

function Protected({ children, admin = false }) {
  const { user, signedOut } = useAuth();
  const location = useLocation();
  if (user === null) return <Loading />;
  if (!user) {
    if (!signedOut) saveReturn(location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }
  if (!profileComplete(user) && location.pathname !== "/complete-profile") return <Navigate to="/complete-profile" replace />;
  if (admin && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user } = useAuth();
  if (user === null) return <Loading />;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  const P = (el, admin) => <Protected admin={admin}>{el}</Protected>;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<PublicOnly><Welcome /></PublicOnly>} />
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/admin/password" element={P(<AdminPassword />, true)} />
        <Route path="/responsible-ai" element={<Guidance />} />
        <Route path="/complete-profile" element={P(<CompleteProfile />)} />
        <Route path="/dashboard" element={P(<Dashboard />)} />
        <Route path="/pathway" element={P(<Pathway />)} />
        <Route path="/tasks" element={P(<Tasks />)} />
        <Route path="/lessons/:id" element={P(<Lesson />)} />
        <Route path="/prompts" element={P(<Prompts />)} />
        <Route path="/profile" element={P(<Profile />)} />
        <Route path="/admin" element={P(<Admin />, true)} />
        <Route path="/admin/lessons/:id" element={P(<AdminLessonEdit />, true)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster position="top-center" />
      </AuthProvider>
    </BrowserRouter>
  );
}
