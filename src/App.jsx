import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import BottomBar from './components/shared/BottomBar';
import Onboarding from './components/onboarding/Onboarding';
import Home from './components/home/Home';
import Profile from './components/home/Profile';
import NewWorkout from './components/flows/new-workout/NewWorkout';
import ActiveWorkout from './components/flows/active-workout/ActiveWorkout';
import BuildProgramme from './components/flows/programme/BuildProgramme';
import ContinueProgramme from './components/flows/programme/ContinueProgramme';
import WorkoutHistory from './components/flows/history/WorkoutHistory';
import Progress from './components/progress/Progress';
import Coach from './components/coach/Coach';
import { storage } from './utils/storage';

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

export default function App() {
  const [hasProfile, setHasProfile] = useState(null);

  useEffect(() => {
    const profile = storage.getProfile();
    setHasProfile(!!profile);
  }, []);

  if (hasProfile === null) return null;

  if (!hasProfile) {
    return (
      <div style={{ background: '#0f0f14', minHeight: '100vh' }}>
        <Onboarding onComplete={() => setHasProfile(true)} />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/new-workout" element={<NewWorkout />} />
          <Route path="/workout/active" element={<ActiveWorkout />} />
          <Route path="/programme/build" element={<BuildProgramme />} />
          <Route path="/programme/continue" element={<ContinueProgramme />} />
          <Route path="/history" element={<WorkoutHistory />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/coach" element={<Coach />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
