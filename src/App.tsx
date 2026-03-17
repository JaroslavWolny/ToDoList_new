import { Suspense, lazy, useEffect, useEffectEvent, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { AppShell } from './components/layout/AppShell';
import { useUserStore } from './stores/userStore';
import { useTaskStore } from './stores/taskStore';

const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const Tasks = lazy(() => import('./pages/Tasks').then((module) => ({ default: module.Tasks })));
const Stats = lazy(() => import('./pages/Stats').then((module) => ({ default: module.Stats })));
const Settings = lazy(() => import('./pages/Settings').then((module) => ({ default: module.Settings })));
const Onboarding = lazy(() => import('./pages/Onboarding').then((module) => ({ default: module.Onboarding })));

function RouteLoader() {
  return (
    <div className="page-container">
      <div className="card-surface rounded-2xl p-5 text-sm text-[var(--color-text-secondary)]">
        Loading...
      </div>
    </div>
  );
}

function App() {
  const { onboardingComplete, theme, gamificationLevel } = useUserStore(
    useShallow((state) => ({
      onboardingComplete: state.onboardingComplete,
      theme: state.settings.theme,
      gamificationLevel: state.settings.gamificationLevel,
    }))
  );
  const { resetRecurringTasks, processOverdueTasks } = useTaskStore(
    useShallow((state) => ({
      resetRecurringTasks: state.resetRecurringTasks,
      processOverdueTasks: state.processOverdueTasks,
    }))
  );
  const { checkStreakOnLoad, removeXP, loseHealth } = useUserStore(
    useShallow((state) => ({
      checkStreakOnLoad: state.checkStreakOnLoad,
      removeXP: state.removeXP,
      loseHealth: state.loseHealth,
    }))
  );
  const hasInitializedRef = useRef(false);
  const lastMaintenanceDateRef = useRef<string>('');

  const runDailyMaintenance = useEffectEvent(() => {
    resetRecurringTasks();
    checkStreakOnLoad();

    const penalties = processOverdueTasks(gamificationLevel);
    penalties.forEach((p) => {
      removeXP(p.xpLost);
      loseHealth();
    });
  });

  // Reset recurring tasks, check streak, and process overdue on app load
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    lastMaintenanceDateRef.current = new Date().toDateString();

    runDailyMaintenance();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const today = new Date().toDateString();
      if (today === lastMaintenanceDateRef.current) return;

      lastMaintenanceDateRef.current = today;
      runDailyMaintenance();
    }, 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'DARK') {
      root.classList.add('dark');
    } else if (theme === 'LIGHT') {
      root.classList.remove('dark');
    } else {
      // AUTO
      const prefersDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme]);

  if (!onboardingComplete) {
    return (
      <BrowserRouter>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="*" element={<Navigate to="/onboarding" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <AppShell>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;
