import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { AchievementToast } from '../gamification/AchievementToast';
import { RaidLootListener } from '../gamification/RaidLootListener';

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
        </div>
    );
}
