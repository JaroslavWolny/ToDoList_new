import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './pages/Dashboard';
import { Tasks } from './pages/Tasks';
import { Stats } from './pages/Stats';
import { Settings } from './pages/Settings';
import { Onboarding } from './pages/Onboarding';
import { useUserStore } from './stores/userStore';
import { useTaskStore } from './stores/taskStore';

function App() {
  const { onboardingComplete, settings } = useUserStore();
  const { resetRecurringTasks, processOverdueTasks } = useTaskStore();
  const { checkStreakOnLoad, removeXP, loseHealth } = useUserStore();

  // Reset recurring tasks, check streak, and process overdue on app load
  useEffect(() => {
    resetRecurringTasks();

    // Check for broken streak
    checkStreakOnLoad();

    // Process overdue task penalties
    const penalties = processOverdueTasks(settings.gamificationLevel);
    penalties.forEach((p) => {
      removeXP(p.xpLost);
      loseHealth();
    });
  }, []);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'DARK') {
      root.classList.add('dark');
    } else if (settings.theme === 'LIGHT') {
      root.classList.remove('dark');
    } else {
      // AUTO
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [settings.theme]);

  if (!onboardingComplete) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;
