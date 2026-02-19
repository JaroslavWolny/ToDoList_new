import { Priority, GamificationLevel } from '../types';

export const XP_VALUES: Record<Priority, number> = {
    LOW: 10,
    MEDIUM: 25,
    HIGH: 50,
    CRITICAL: 100,
};

export function calculateXP(priority: Priority): number {
    return XP_VALUES[priority];
}

export function calculateLevel(xp: number): number {
    return Math.floor(Math.sqrt(xp / 100));
}

export function xpForLevel(level: number): number {
    return level * level * 100;
}

export function xpForNextLevel(currentLevel: number): number {
    return xpForLevel(currentLevel + 1);
}

export function xpProgressInLevel(xp: number, level: number): number {
    const currentLevelXP = xpForLevel(level);
    const nextLevelXP = xpForLevel(level + 1);
    const range = nextLevelXP - currentLevelXP;
    if (range <= 0) return 0;
    return Math.min(((xp - currentLevelXP) / range) * 100, 100);
}

export function calculateComboMultiplier(completionsToday: number): number {
    if (completionsToday >= 8) return 1.5;
    if (completionsToday >= 5) return 1.25;
    if (completionsToday >= 3) return 1.1;
    return 1.0;
}

export function getComboLabel(multiplier: number): string {
    if (multiplier >= 1.5) return '🔥 MEGA COMBO ×1.5';
    if (multiplier >= 1.25) return '⚡ SUPER COMBO ×1.25';
    if (multiplier >= 1.1) return '✨ COMBO ×1.1';
    return '';
}

export function calculatePenalty(
    priority: Priority,
    gamificationLevel: GamificationLevel
): number {
    const baseXP = XP_VALUES[priority];
    const penaltyPercent = gamificationLevel === 'CASUAL' ? 0.25 :
        gamificationLevel === 'STANDARD' ? 0.5 : 0.75;
    return Math.floor(baseXP * penaltyPercent);
}

export function calculateStreakBreakPenalty(
    currentXP: number,
    gamificationLevel: GamificationLevel
): number {
    const penaltyPercent = gamificationLevel === 'CASUAL' ? 0.05 :
        gamificationLevel === 'STANDARD' ? 0.1 : 0.15;
    return Math.min(Math.floor(currentXP * penaltyPercent), 500);
}

export function isStreakDay(lastCompletedDate: string | null): 'active' | 'danger' | 'broken' {
    if (!lastCompletedDate) return 'broken';

    const now = new Date();
    const last = new Date(lastCompletedDate);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());

    const diffMs = today.getTime() - lastDay.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays <= 0) return 'active';
    if (diffDays <= 1) {
        // Grace period: check if current time is before 03:00
        if (now.getHours() < 3) return 'active';
        return 'danger';
    }
    return 'broken';
}

export function getStreakMilestone(streak: number): number | null {
    const milestones = [7, 14, 30, 60, 100, 365];
    return milestones.find(m => m === streak) || null;
}

export function getLevelTitle(level: number): string {
    if (level >= 50) return 'Legendary';
    if (level >= 40) return 'Grandmaster';
    if (level >= 30) return 'Master';
    if (level >= 25) return 'Expert';
    if (level >= 20) return 'Veteran';
    if (level >= 15) return 'Adept';
    if (level >= 10) return 'Skilled';
    if (level >= 7) return 'Apprentice';
    if (level >= 5) return 'Promising';
    if (level >= 3) return 'Beginner';
    if (level >= 1) return 'Rookie';
    return 'Newcomer';
}

export function getPriorityLabel(priority: Priority): string {
    const labels: Record<Priority, string> = {
        LOW: 'Low',
        MEDIUM: 'Medium',
        HIGH: 'High',
        CRITICAL: 'Critical',
    };
    return labels[priority];
}

export function getPriorityColor(priority: Priority): string {
    const colors: Record<Priority, string> = {
        LOW: 'priority-low',
        MEDIUM: 'priority-medium',
        HIGH: 'priority-high',
        CRITICAL: 'priority-critical',
    };
    return colors[priority];
}
