import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, clearLocalDatabase } from './db/db';
import { useAuth } from './firebase/useAuth';
import { auth } from './firebase/config';
import { pullCloudChanges } from './firebase/sync';
import { LandingPage } from './screens/LandingPage';
import { LoginScreen } from './screens/LoginScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { AdminScreen } from './screens/AdminScreen';
import { TrackRepairScreen } from './screens/TrackRepairScreen';
import { isSuperAdmin } from './utils/admin';
import { LoadingScreen } from './components/LoadingScreen';
import App from './App';
import { WebApp } from './screens/web/WebApp';
import { PrivacyScreen } from './screens/legal/PrivacyScreen';
import { TermsScreen } from './screens/legal/TermsScreen';

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

  const isMismatched = Boolean(
    user &&
    settingsList &&
    settingsList.length > 0 &&
    settingsList[0].ownerUid &&
    settingsList[0].ownerUid !== user.uid
  );

  useEffect(() => {
    if (!user || settingsList === undefined) return;

    if (isMismatched) {
      clearLocalDatabase().then(() => {
        setCheckingCloud(true);
        pullCloudChanges(user.uid)
          .catch(err => console.warn('Could not pull cloud changes on app route:', err))
          .finally(() => {
            setCheckedCloudUid(user.uid);
            setCheckingCloud(false);
          });
      });
      return;
    }

    if (settingsList.length === 0 && checkedCloudUid !== user.uid) {
      setCheckingCloud(true);
      pullCloudChanges(user.uid)
        .catch(err => console.warn('Could not pull cloud changes on app route:', err))
        .finally(() => {
          setCheckedCloudUid(user.uid);
          setCheckingCloud(false);
        });
    }
  }, [user, settingsList, checkedCloudUid, isMismatched]);

  if (authLoading || settingsList === undefined || isMismatched || (user && settingsList.length === 0 && (checkingCloud || checkedCloudUid !== user.uid))) {
    return (
      <LoadingScreen
        message="Opening your Day Book..."
        submessage="Syncing latest shop transactions & repairs"
      />
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

  const isMismatched = Boolean(
    user &&
    settingsList &&
    settingsList.length > 0 &&
    settingsList[0].ownerUid &&
    settingsList[0].ownerUid !== user.uid
  );

  useEffect(() => {
    if (!user || settingsList === undefined) return;

    if (isMismatched) {
      clearLocalDatabase().then(() => {
        setCheckingCloud(true);
        pullCloudChanges(user.uid)
          .catch(err => console.warn('Could not pull cloud changes on login route:', err))
          .finally(() => {
            setCheckedCloudUid(user.uid);
            setCheckingCloud(false);
          });
      });
      return;
    }

    if (settingsList.length === 0 && checkedCloudUid !== user.uid) {
      setCheckingCloud(true);
      pullCloudChanges(user.uid)
        .catch(err => console.warn('Could not pull cloud changes on login route:', err))
        .finally(() => {
          setCheckedCloudUid(user.uid);
          setCheckingCloud(false);
        });
    }
  }, [user, settingsList, checkedCloudUid, isMismatched]);

  if (authLoading || settingsList === undefined || isMismatched || (user && settingsList.length === 0 && (checkingCloud || checkedCloudUid !== user.uid))) {
    return (
      <LoadingScreen
        message={user ? "Signing in to your shop..." : "Connecting..."}
        submessage="Securing your cloud and offline ledger"
      />
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
    let list = await db.settings.toArray();
    if (list.length === 0) {
      const currentUser = auth?.currentUser;
      if (currentUser) {
        try {
          await pullCloudChanges(currentUser.uid);
          list = await db.settings.toArray();
        } catch (e) {
          console.warn('Sync attempt in handleLoginSuccess failed:', e);
        }
      }
    }

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

  const isMismatched = Boolean(
    user &&
    settingsList &&
    settingsList.length > 0 &&
    settingsList[0].ownerUid &&
    settingsList[0].ownerUid !== user.uid
  );

  useEffect(() => {
    if (!user || settingsList === undefined) return;

    if (isMismatched) {
      clearLocalDatabase().then(() => {
        setCheckingCloud(true);
        pullCloudChanges(user.uid)
          .catch(err => console.warn('Could not pull cloud changes on onboarding route:', err))
          .finally(() => {
            setCheckedCloudUid(user.uid);
            setCheckingCloud(false);
          });
      });
      return;
    }

    if (settingsList.length === 0 && checkedCloudUid !== user.uid) {
      setCheckingCloud(true);
      pullCloudChanges(user.uid)
        .catch(err => console.warn('Could not pull cloud changes on onboarding route:', err))
        .finally(() => {
          setCheckedCloudUid(user.uid);
          setCheckingCloud(false);
        });
    }
  }, [user, settingsList, checkedCloudUid, isMismatched]);

  if (authLoading || settingsList === undefined || isMismatched || (user && settingsList.length === 0 && (checkingCloud || checkedCloudUid !== user.uid))) {
    return (
      <LoadingScreen
        message="Preparing setup..."
        submessage="Getting your shop counter ready"
      />
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
  // When launched from Android/iOS home screen in standalone mode, go directly into app
  if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
    return <Navigate to="/app" replace />;
  }
  return <LandingPage isAuthenticated={!!user} />;
}

/** Protected Admin Route wrapper: strictly superadmin only */
function AdminRouteWrapper() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <LoadingScreen
        message="Verifying admin credentials..."
        submessage="Connecting to superadmin dashboard"
      />
    );
  }

  // Not signed in: redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Signed in but not designated superadmin: deny access and redirect to app
  if (!isSuperAdmin(user)) {
    return <Navigate to="/app" replace />;
  }

  return <AdminScreen />;
}

/** Component handling protected web desktop app entry */
function WebRouteWrapper() {
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

  const isMismatched = Boolean(
    user &&
    settingsList &&
    settingsList.length > 0 &&
    settingsList[0].ownerUid &&
    settingsList[0].ownerUid !== user.uid
  );

  useEffect(() => {
    if (!user || settingsList === undefined) return;

    if (isMismatched) {
      clearLocalDatabase().then(() => {
        setCheckingCloud(true);
        pullCloudChanges(user.uid)
          .catch(err => console.warn('Could not pull cloud changes on web route:', err))
          .finally(() => {
            setCheckedCloudUid(user.uid);
            setCheckingCloud(false);
          });
      });
      return;
    }

    if (settingsList.length === 0 && checkedCloudUid !== user.uid) {
      setCheckingCloud(true);
      pullCloudChanges(user.uid)
        .catch(err => console.warn('Could not pull cloud changes on web route:', err))
        .finally(() => {
          setCheckedCloudUid(user.uid);
          setCheckingCloud(false);
        });
    }
  }, [user, settingsList, checkedCloudUid, isMismatched]);

  if (authLoading || settingsList === undefined || isMismatched || (user && settingsList.length === 0 && (checkingCloud || checkedCloudUid !== user.uid))) {
    return (
      <LoadingScreen
        message="Opening Web Day Book..."
        submessage="Syncing latest shop transactions & desktop workspace"
      />
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

  return <WebApp />;
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
        <Route path="/web/app" element={<WebRouteWrapper />} />
        <Route path="/web/app/*" element={<WebRouteWrapper />} />
        <Route path="/admin" element={<AdminRouteWrapper />} />
        <Route path="/track/:trackingId" element={<TrackRepairScreen />} />
        <Route path="/privacy" element={<PrivacyScreen />} />
        <Route path="/terms" element={<TermsScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
