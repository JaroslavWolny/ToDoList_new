import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { AchievementToast } from '../gamification/AchievementToast';
import { RaidLootListener } from '../gamification/RaidLootListener';
import { FocusTimerModal } from '../focus/FocusTimerModal';

interface AppShellProps {
    children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    return (
        <div className="min-h-screen relative">
            <AchievementToast />
            <main>{children}</main>
            <BottomNav />
            <RaidLootListener />
            {/* Deep-Work overlay lives at the shell so a running session
                survives navigation between tabs. */}
            <FocusTimerModal />
        </div>
    );
}
