import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AuthCallback } from '@/components/auth/AuthCallback';
import { AppShell } from '@/components/layout/AppShell';

// ─── Public pages ───
const LoginPage = lazy(() => import('@/components/auth/LoginPage'));
const SignupPage = lazy(() => import('@/components/auth/SignupPage'));

// ─── Owner pages ───
const DashboardPage = lazy(() => import('@/pages/owner/DashboardPage'));
const ParcelsPage = lazy(() => import('@/pages/owner/ParcelsPage'));
const ParcelDetailPage = lazy(() => import('@/pages/owner/ParcelDetailPage'));
const SurveysPage = lazy(() => import('@/pages/owner/SurveysPage'));
const SurveyDetailPage = lazy(() => import('@/pages/owner/SurveyDetailPage'));
const ReportsPage = lazy(() => import('@/pages/owner/ReportsPage'));
const SettingsPage = lazy(() => import('@/pages/owner/SettingsPage'));
const CapturePage = lazy(() => import('@/pages/owner/CapturePage'));
const VisionSearchPage = lazy(() => import('@/pages/owner/VisionSearchPage'));
const NewsPage = lazy(() => import('@/pages/owner/NewsPage'));

// ─── Public content pages ───
const BlogPage = lazy(() => import('@/pages/public/BlogPage'));
const BlogPostPage = lazy(() => import('@/pages/public/BlogPostPage'));

// ─── Pilot pages ───
const PilotDashboardPage = lazy(() => import('@/pages/pilot/PilotDashboardPage'));
const JobBoardPage = lazy(() => import('@/pages/pilot/JobBoardPage'));
const JobDetailPage = lazy(() => import('@/pages/pilot/JobDetailPage'));
const EarningsPage = lazy(() => import('@/pages/pilot/EarningsPage'));
const PilotSettingsPage = lazy(() => import('@/pages/pilot/PilotSettingsPage'));

// ─── Inspector pages ───
const InspectorDashboardPage = lazy(() => import('@/pages/inspector/InspectorDashboardPage'));
const InspectorSurveysPage = lazy(() => import('@/pages/inspector/InspectorSurveysPage'));
const InspectorReportsPage = lazy(() => import('@/pages/inspector/InspectorReportsPage'));
const InspectorSettingsPage = lazy(() => import('@/pages/inspector/InspectorSettingsPage'));

// ─── Shared ───
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg)]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
        </div>
        <span className="text-sm text-[var(--text2)] font-mono tracking-wider uppercase">
          Loading
        </span>
      </div>
    </div>
  );
}

function RootRedirect() {
  const { profile, isLoading } = useAuthStore();

  if (isLoading) return <LoadingScreen />;

  if (!profile) return <Navigate to="/login" replace />;

  switch (profile.role) {
    case 'owner':
      return <Navigate to="/owner/dashboard" replace />;
    case 'pilot':
      return <Navigate to="/pilot/dashboard" replace />;
    case 'inspector':
      return <Navigate to="/inspector/dashboard" replace />;
    case 'admin':
      return <Navigate to="/owner/dashboard" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

export function App() {
  const { initialize, isInitialized } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Root redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:id" element={<BlogPostPage />} />

          {/* Owner routes */}
          <Route
            path="/owner"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="parcels" element={<ParcelsPage />} />
            <Route path="parcels/:id" element={<ParcelDetailPage />} />
            <Route path="surveys" element={<SurveysPage />} />
            <Route path="surveys/:id" element={<SurveyDetailPage />} />
            <Route path="capture" element={<CapturePage />} />
            <Route path="vision" element={<VisionSearchPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="news" element={<NewsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Pilot routes */}
          <Route
            path="/pilot"
            element={
              <ProtectedRoute allowedRoles={['pilot', 'admin']}>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<PilotDashboardPage />} />
            <Route path="jobs" element={<JobBoardPage />} />
            <Route path="jobs/:id" element={<JobDetailPage />} />
            <Route path="earnings" element={<EarningsPage />} />
            <Route path="settings" element={<PilotSettingsPage />} />
          </Route>

          {/* Inspector routes */}
          <Route
            path="/inspector"
            element={
              <ProtectedRoute allowedRoles={['inspector', 'admin']}>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<InspectorDashboardPage />} />
            <Route path="surveys" element={<InspectorSurveysPage />} />
            <Route path="reports" element={<InspectorReportsPage />} />
            <Route path="settings" element={<InspectorSettingsPage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
