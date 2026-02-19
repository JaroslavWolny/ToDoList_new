import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DailyMission } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface MissionStore {
    missions: DailyMission[];
    lastGeneratedDate: string | null;
    generateDailyMissions: () => void;
    updateMissionProgress: (type: DailyMission['type'], progress: number) => void;
    completeMission: (id: string) => number;
    getMissionsForToday: () => DailyMission[];
}

const missionTemplates: Array<{
    type: DailyMission['type'];
    title: string;
    description: string;
    target: number;
    rewardXP: number;
}> = [
        {
            type: 'complete_tasks',
            title: 'Task Hunter',
            description: 'Complete 3 tasks today',
            target: 3,
            rewardXP: 30,
        },
        {
            type: 'complete_critical',
            title: 'Critical Strike',
            description: 'Complete 1 critical task',
            target: 1,
            rewardXP: 50,
        },
        {
            type: 'early_bird',
            title: 'Early Bird',
            description: 'Complete a task before 10:00 AM',
            target: 1,
            rewardXP: 25,
        },
        {
            type: 'complete_high',
            title: 'High Achiever',
            description: 'Complete 2 high-priority tasks',
            target: 2,
            rewardXP: 40,
        },
        {
            type: 'complete_tasks',
            title: 'Productivity Burst',
            description: 'Complete 5 tasks today',
            target: 5,
            rewardXP: 60,
        },
    ];

function pickRandomMissions(count: number): DailyMission[] {
    const shuffled = [...missionTemplates].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);
    return selected.map((template) => ({
        id: uuidv4(),
        ...template,
        progress: 0,
        completed: false,
    }));
}

export const useMissionStore = create<MissionStore>()(
    persist(
        (set, get) => ({
            missions: [],
            lastGeneratedDate: null,

            generateDailyMissions: () => {
                const today = new Date().toISOString().split('T')[0];
                const { lastGeneratedDate } = get();
                if (lastGeneratedDate === today) return;

                const newMissions = pickRandomMissions(3);
                set({
                    missions: newMissions,
                    lastGeneratedDate: today,
                });
            },

            updateMissionProgress: (type, progress) => {
                set((state) => ({
                    missions: state.missions.map((m) =>
                        m.type === type && !m.completed
                            ? { ...m, progress: Math.min(m.target, progress) }
                            : m
                    ),
                }));
            },

            completeMission: (id) => {
                const mission = get().missions.find((m) => m.id === id);
                if (!mission || mission.completed) return 0;

                set((state) => ({
                    missions: state.missions.map((m) =>
                        m.id === id ? { ...m, completed: true } : m
                    ),
                }));

                return mission.rewardXP;
            },

            getMissionsForToday: () => {
                const { missions, lastGeneratedDate } = get();
                const today = new Date().toISOString().split('T')[0];
                if (lastGeneratedDate !== today) return [];
                return missions;
            },
        }),
        {
            name: 'todolist-mission-store',
        }
    )
);
