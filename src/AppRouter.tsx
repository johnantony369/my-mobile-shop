import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import { useAuth } from './firebase/useAuth';
import { pullCloudChanges } from './firebase/sync';
import { LandingPage } from './screens/LandingPage';
import { LoginScreen } from './screens/LoginScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import App from './App';

/** Component handling protected app entry */
function AppRouteWrapper() {
  const { user, loading: authLoading } = useAuth();
  const [checkingCloud, setCheckingCloud] = useState(false);
  const [checkedCloudUid, setCheckedCloudUid] = useState<string | null>(null);

  const settingsList = useLiveQuery(async () => {
    try {
      await db.open();
      return await db.settings.toArray();
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    if (user && settingsList !== undefined && settingsList.length === 0 && checkedCloudUid !== user.uid) {
      setCheckingCloud(true);
      pullCloudChanges(user.uid)
        .catch(err => console.warn('Could not pull cloud changes on app route:', err))
        .finally(() => {
          setCheckedCloudUid(user.uid);
          setCheckingCloud(false);
        });
    }
  }, [user, settingsList, checkedCloudUid]);

  if (authLoading || settingsList === undefined || (user && settingsList.length === 0 && (checkingCloud || checkedCloudUid !== user.uid))) {
    return (
      <div className="min-h-screen bg-iosBg flex items-center justify-center p-6 text-center select-none">
        <div className="w-9 h-9 border-3 border-iosBlue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not signed in: redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Signed in but no settings: redirect to onboarding
  if (settingsList.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  return <App />;
}

/** Component handling /login screen logic */
function LoginRouteWrapper() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checkingCloud, setCheckingCloud] = useState(false);
  const [checkedCloudUid, setCheckedCloudUid] = useState<string | null>(null);

  const settingsList = useLiveQuery(async () => {
    try {
      await db.open();
      return await db.settings.toArray();
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    if (user && settingsList !== undefined && settingsList.length === 0 && checkedCloudUid !== user.uid) {
      setCheckingCloud(true);
      pullCloudChanges(user.uid)
        .catch(err => console.warn('Could not pull cloud changes on login route:', err))
        .finally(() => {
          setCheckedCloudUid(user.uid);
          setCheckingCloud(false);
        });
    }
  }, [user, settingsList, checkedCloudUid]);

  if (authLoading || settingsList === undefined || (user && settingsList.length === 0 && (checkingCloud || checkedCloudUid !== user.uid))) {
    return (
      <div className="min-h-screen bg-iosBg flex items-center justify-center p-6 text-center select-none">
        <div className="w-9 h-9 border-3 border-iosBlue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If already authenticated: route to onboarding (if truly new) or app (if configured)
  if (user) {
    if (settingsList.length === 0) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/app" replace />;
  }

  const handleLoginSuccess = async () => {
    const list = await db.settings.toArray();
    if (list.length === 0) {
      navigate('/onboarding', { replace: true });
    } else {
      navigate('/app', { replace: true });
    }
  };

  return <LoginScreen onSuccess={handleLoginSuccess} />;
}

/** Component handling /onboarding screen logic */
function OnboardingRouteWrapper() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checkingCloud, setCheckingCloud] = useState(false);
  const [checkedCloudUid, setCheckedCloudUid] = useState<string | null>(null);

  const settingsList = useLiveQuery(async () => {
    try {
      await db.open();
      return await db.settings.toArray();
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    if (user && settingsList !== undefined && settingsList.length === 0 && checkedCloudUid !== user.uid) {
      setCheckingCloud(true);
      pullCloudChanges(user.uid)
        .catch(err => console.warn('Could not pull cloud changes on onboarding route:', err))
        .finally(() => {
          setCheckedCloudUid(user.uid);
          setCheckingCloud(false);
        });
    }
  }, [user, settingsList, checkedCloudUid]);

  if (authLoading || settingsList === undefined || (user && settingsList.length === 0 && (checkingCloud || checkedCloudUid !== user.uid))) {
    return (
      <div className="min-h-screen bg-iosBg flex items-center justify-center p-6 text-center select-none">
        <div className="w-9 h-9 border-3 border-iosBlue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Login MUST precede onboarding
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Already onboarded (or restored from cloud): send directly to app
  if (settingsList.length > 0) {
    return <Navigate to="/app" replace />;
  }

  const handleOnboardingComplete = () => {
    navigate('/app', { replace: true });
  };

  return <OnboardingScreen onComplete={handleOnboardingComplete} />;
}

/** Root Landing Page wrapper */
function LandingRouteWrapper() {
  const { user } = useAuth();
  return <LandingPage isAuthenticated={!!user} />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingRouteWrapper />} />
        <Route path="/login" element={<LoginRouteWrapper />} />
        <Route path="/onboarding" element={<OnboardingRouteWrapper />} />
        <Route path="/app" element={<AppRouteWrapper />} />
        <Route path="/app/*" element={<AppRouteWrapper />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
