import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ActiveWorkoutProvider } from './context/ActiveWorkoutContext';
import ProtectedRoute from './auth/ProtectedRoute';
import LocalStorageMigration from './auth/LocalStorageMigration';
import BottomBar from './components/shared/BottomBar';

// Auth screens
import LoginScreen         from './screens/LoginScreen';
import RegisterScreen      from './screens/RegisterScreen';
import VerifyEmailScreen   from './screens/VerifyEmailScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ResetPasswordScreen  from './screens/ResetPasswordScreen';
import AccountSettingsScreen from './screens/AccountSettingsScreen';

// App screens
import Onboarding      from './components/onboarding/Onboarding';
import Home            from './components/home/Home';
import Profile         from './components/home/Profile';
import NewWorkout      from './components/flows/new-workout/NewWorkout';
import ActiveWorkout   from './components/flows/active-workout/ActiveWorkout';
import BuildProgramme  from './components/flows/programme/BuildProgramme';
import ContinueProgramme from './components/flows/programme/ContinueProgramme';
import WorkoutHistory  from './components/flows/history/WorkoutHistory';
import Progress        from './components/progress/Progress';
import Coach           from './components/coach/Coach';

const NO_BOTTOM_BAR = ['/workout/active'];

function Layout({ children }) {
  const location = useLocation();
  const showBar = !NO_BOTTOM_BAR.some(p => location.pathname.startsWith(p));
  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#0f0f14' }}>
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
  // Guard so the effect only makes the initial hasProfile determination once.
  // After onComplete() sets hasProfile=true, we must not let a profile change
  // (e.g. from setProfile inside Onboarding) flip it back to false.
  const profileDetermined = useRef(false);

  useEffect(() => {
    if (!isLoading) {
      // Only determine hasProfile once — after that, onComplete() owns the transition
      if (!profileDetermined.current) {
        profileDetermined.current = true;
        const profileComplete = !!(profile?.fitness_goal || profile?.extra_data?.name);
        console.log('[AppShell] initial profile check → complete:', profileComplete, profile);
        setHasProfile(profileComplete);
      }
      // Show migration prompt once per session after login
      if (!sessionStorage.getItem('migration_checked')) {
        sessionStorage.setItem('migration_checked', '1');
        setShowMigration(true);
      }
    }
  }, [isLoading, profile]);

  if (isLoading || hasProfile === null) {
    console.log('[AppShell] returning null — isLoading:', isLoading, 'hasProfile:', hasProfile);
    return null;
  }

  if (!hasProfile) {
    console.log('[AppShell] rendering Onboarding');
    return (
      <div style={{ background: '#0f0f14', minHeight: '100vh' }}>
        <Onboarding onComplete={() => { console.log('[AppShell] onComplete called → setting hasProfile=true'); setHasProfile(true); }} />
        {showMigration && <LocalStorageMigration onDone={() => setShowMigration(false)} />}
      </div>
    );
  }

  return (
    <Layout>
      {showMigration && <LocalStorageMigration onDone={() => setShowMigration(false)} />}
      <Routes>
        <Route path="/"                  element={<Home />} />
        <Route path="/profile"           element={<Profile />} />
        <Route path="/account"           element={<AccountSettingsScreen />} />
        <Route path="/new-workout"       element={<NewWorkout />} />
        <Route path="/workout/active"    element={<ActiveWorkout />} />
        <Route path="/programme/build"   element={<BuildProgramme />} />
        <Route path="/programme/continue" element={<ContinueProgramme />} />
        <Route path="/history"           element={<WorkoutHistory />} />
        <Route path="/progress"          element={<Progress />} />
        <Route path="/coach"             element={<Coach />} />
        <Route path="*"                  element={<Navigate to="/" replace />} />
      </Routes>
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
