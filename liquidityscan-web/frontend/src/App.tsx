import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from './contexts/ThemeContext';
import MainLayout from './components/MainLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AnimatedPage } from './components/animations/AnimatedPage';
import { OAuthHandler } from './components/OAuthHandler';
import './index.css';

// Lazy load pages for code splitting
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const MonitorSuperEngulfing = lazy(() => import('./pages/MonitorSuperEngulfing').then(m => ({ default: m.MonitorSuperEngulfing })));
const MonitorBias = lazy(() => import('./pages/MonitorBias').then(m => ({ default: m.MonitorBias })));
const MonitorRSI = lazy(() => import('./pages/MonitorRSI').then(m => ({ default: m.MonitorRSI })));
const SignalDetails = lazy(() => import('./pages/SignalDetails').then(m => ({ default: m.SignalDetails })));
const StrategiesDashboard = lazy(() => import('./pages/StrategiesDashboard').then(m => ({ default: m.StrategiesDashboard })));
const StrategyDetail = lazy(() => import('./pages/StrategyDetail').then(m => ({ default: m.StrategyDetail })));
const ToolsDashboard = lazy(() => import('./pages/ToolsDashboard').then(m => ({ default: m.ToolsDashboard })));
const DailyRecap = lazy(() => import('./pages/DailyRecap').then(m => ({ default: m.DailyRecap })));
const RiskCalculator = lazy(() => import('./pages/RiskCalculator').then(m => ({ default: m.RiskCalculator })));
const SuperEngulfing = lazy(() => import('./pages/SuperEngulfing').then(m => ({ default: m.SuperEngulfing })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Support = lazy(() => import('./pages/Support').then(m => ({ default: m.Support })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Subscriptions = lazy(() => import('./pages/Subscriptions').then(m => ({ default: m.Subscriptions })));
const Payment = lazy(() => import('./pages/Payment').then(m => ({ default: m.Payment })));

// Admin Pages
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const UsersManagement = lazy(() => import('./pages/admin/UsersManagement').then(m => ({ default: m.UsersManagement })));
const PaymentsManagement = lazy(() => import('./pages/admin/PaymentsManagement').then(m => ({ default: m.PaymentsManagement })));
const Analytics = lazy(() => import('./pages/admin/Analytics').then(m => ({ default: m.Analytics })));
const AdminSettings = lazy(() => import('./pages/admin/Settings').then(m => ({ default: m.Settings })));
const CoursesManagement = lazy(() => import('./pages/admin/CoursesManagement').then(m => ({ default: m.CoursesManagement })));
const AdminCourseDetail = lazy(() => import('./pages/admin/AdminCourseDetail').then(m => ({ default: m.AdminCourseDetail })));
const Courses = lazy(() => import('./pages/Courses').then(m => ({ default: m.Courses })));
const CourseDetail = lazy(() => import('./pages/CourseDetail').then(m => ({ default: m.CourseDetail })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen w-full bg-background-dark">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <div className="text-white text-lg">Loading...</div>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  const location = useLocation();

  return (
    <>
      <OAuthHandler />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AnimatedPage><Login /></AnimatedPage>} />
          <Route path="/register" element={<AnimatedPage><Register /></AnimatedPage>} />

          {/* Redirect /app to dashboard */}
          <Route path="/app" element={<Navigate to="/dashboard" replace />} />
          <Route path="/app/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/app/dashboard" element={<Navigate to="/dashboard" replace />} />

          {/* Protected Routes */}
          <Route element={<MainLayout />}>
            <Route path="dashboard" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
            <Route path="monitor/superengulfing" element={<AnimatedPage><MonitorSuperEngulfing /></AnimatedPage>} />
            <Route path="monitor/bias" element={<AnimatedPage><MonitorBias /></AnimatedPage>} />
            <Route path="monitor/rsi" element={<AnimatedPage><MonitorRSI /></AnimatedPage>} />
            <Route path="signals/:id" element={<AnimatedPage><SignalDetails /></AnimatedPage>} />
            <Route path="strategies" element={<AnimatedPage><StrategiesDashboard /></AnimatedPage>} />
            <Route path="strategies/:id" element={<AnimatedPage><StrategyDetail /></AnimatedPage>} />
            <Route path="tools" element={<AnimatedPage><ToolsDashboard /></AnimatedPage>} />
            <Route path="daily-recap" element={<AnimatedPage><DailyRecap /></AnimatedPage>} />
            <Route path="risk-calculator" element={<AnimatedPage><RiskCalculator /></AnimatedPage>} />
            <Route path="superengulfing" element={<SuperEngulfing />} />
            <Route path="settings" element={<AnimatedPage><Settings /></AnimatedPage>} />
            <Route path="support" element={<AnimatedPage><Support /></AnimatedPage>} />
            <Route path="profile" element={<AnimatedPage><Profile /></AnimatedPage>} />
            <Route path="courses" element={<AnimatedPage><Courses /></AnimatedPage>} />
            <Route path="courses/:id" element={<AnimatedPage><CourseDetail /></AnimatedPage>} />
            <Route path="subscription" element={<AnimatedPage><Subscriptions /></AnimatedPage>} />
            <Route path="subscriptions" element={<AnimatedPage><Subscriptions /></AnimatedPage>} />
            <Route path="payment/:id" element={<AnimatedPage><Payment /></AnimatedPage>} />
          </Route>

          {/* Admin Routes */}
          <Route element={<AdminLayout />}>
            <Route path="admin" element={<AnimatedPage><AdminDashboard /></AnimatedPage>} />
            <Route path="admin/users" element={<AnimatedPage><UsersManagement /></AnimatedPage>} />
            <Route path="admin/courses" element={<AnimatedPage><CoursesManagement /></AnimatedPage>} />
            <Route path="admin/courses/:id" element={<AnimatedPage><AdminCourseDetail /></AnimatedPage>} />
            <Route path="admin/payments" element={<AnimatedPage><PaymentsManagement /></AnimatedPage>} />
            <Route path="admin/analytics" element={<AnimatedPage><Analytics /></AnimatedPage>} />
            <Route path="admin/settings" element={<AnimatedPage><AdminSettings /></AnimatedPage>} />
          </Route>
        </Routes>
      </AnimatePresence>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <BrowserRouter>
              <Suspense fallback={<LoadingFallback />}>
                <AppRoutes />
              </Suspense>
            </BrowserRouter>
          </ThemeProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
