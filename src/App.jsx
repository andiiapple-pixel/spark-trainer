import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ActiveWorkoutProvider } from './context/ActiveWorkoutContext';
import ProtectedRoute from './auth/ProtectedRoute';
import LocalStorageMigration from './auth/LocalStorageMigration';
import BottomBar from './components/shared/BottomBar';
import ErrorBoundary from './components/shared/ErrorBoundary';

// Auth screens — eagerly loaded (small, needed immediately)
import LoginScreen          from './screens/LoginScreen';
import RegisterScreen       from './screens/RegisterScreen';
import VerifyEmailScreen    from './screens/VerifyEmailScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ResetPasswordScreen  from './screens/ResetPasswordScreen';

// App screens — lazily loaded (only when navigated to)
const AccountSettingsScreen = lazy(() => import('./screens/AccountSettingsScreen'));
const Onboarding            = lazy(() => import('./components/onboarding/Onboarding'));
const Home                  = lazy(() => import('./components/home/Home'));
const Profile               = lazy(() => import('./components/home/Profile'));
const NewWorkout            = lazy(() => import('./components/flows/new-workout/NewWorkout'));
const ActiveWorkout         = lazy(() => import('./components/flows/active-workout/ActiveWorkout'));
const BuildProgramme        = lazy(() => import('./components/flows/programme/BuildProgramme'));
const ContinueProgramme     = lazy(() => import('./components/flows/programme/ContinueProgramme'));
const WorkoutHistory        = lazy(() => import('./components/flows/history/WorkoutHistory'));
const Progress              = lazy(() => import('./components/progress/Progress'));
const Coach                 = lazy(() => import('./components/coach/Coach'));
const ExerciseLibrary       = lazy(() => import('./components/exercises/ExerciseLibrary'));
const ExerciseDetail        = lazy(() => import('./components/exercises/ExerciseDetail'));

const NO_BOTTOM_BAR = ['/workout/active'];

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: '#0A0A0A' }}>
      <div className="w-8 h-8 border-2 animate-spin" style={{ borderColor: '#222222', borderTopColor: '#E8FF00' }} />
    </div>
  );
}

function Layout({ children }) {
  const location = useLocation();
  const showBar = !NO_BOTTOM_BAR.some(p => location.pathname.startsWith(p));
  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#0A0A0A' }}>
      <div className="flex-1">{children}</div>
      {showBar && <BottomBar />}
    </div>
  );
}

// App shell: requires auth + profile
function AppShell() {
  const { user, profile, isLoading } = useAuth();
  const [hasProfile, setHasProfile] = useState(null);
  const [showMigration, setShowMigration] = useState(false);
  const profileDetermined = useRef(false);

  useEffect(() => {
    if (!isLoading) {
      if (!profileDetermined.current) {
        profileDetermined.current = true;
        const profileComplete = !!(profile?.fitness_goal || profile?.extra_data?.name);
        setHasProfile(profileComplete);
      }
      if (!sessionStorage.getItem('migration_checked')) {
        sessionStorage.setItem('migration_checked', '1');
        setShowMigration(true);
      }
    }
  }, [isLoading, profile]);

  if (isLoading || hasProfile === null) {
    return <PageLoader />;
  }

  if (!hasProfile) {
    return (
      <div style={{ background: '#0A0A0A', minHeight: '100vh' }}>
        <Suspense fallback={<PageLoader />}>
          <Onboarding onComplete={() => setHasProfile(true)} />
        </Suspense>
        {showMigration && <LocalStorageMigration onDone={() => setShowMigration(false)} />}
      </div>
    );
  }

  return (
    <Layout>
      {showMigration && <LocalStorageMigration onDone={() => setShowMigration(false)} />}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"                   element={<ErrorBoundary><Home /></ErrorBoundary>} />
          <Route path="/profile"            element={<Profile />} />
          <Route path="/account"            element={<AccountSettingsScreen />} />
          <Route path="/new-workout"        element={<ErrorBoundary><NewWorkout /></ErrorBoundary>} />
          <Route path="/workout/active"     element={<ErrorBoundary><ActiveWorkout /></ErrorBoundary>} />
          <Route path="/programme/build"    element={<BuildProgramme />} />
          <Route path="/programme/continue" element={<ContinueProgramme />} />
          <Route path="/history"            element={<WorkoutHistory />} />
          <Route path="/progress"           element={<ErrorBoundary><Progress /></ErrorBoundary>} />
          <Route path="/coach"              element={<ErrorBoundary><Coach /></ErrorBoundary>} />
          <Route path="/exercises"          element={<ExerciseLibrary />} />
          <Route path="/exercises/:slug"    element={<ExerciseDetail />} />
          <Route path="*"                   element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ActiveWorkoutProvider>
          <Routes>
            {/* Public auth routes */}
            <Route path="/login"            element={<LoginScreen />} />
            <Route path="/register"         element={<RegisterScreen />} />
            <Route path="/verify-email"     element={<VerifyEmailScreen />} />
            <Route path="/forgot-password"  element={<ForgotPasswordScreen />} />
            <Route path="/reset-password"   element={<ResetPasswordScreen />} />

            {/* Protected app routes */}
            <Route path="/*" element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            } />
          </Routes>
        </ActiveWorkoutProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
