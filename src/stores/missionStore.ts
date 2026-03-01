import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DailyMission, MainMotivation } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { toLocalDateKey } from '../lib/dates';
import { useUserStore } from './userStore';

interface MissionStore {
    missions: DailyMission[];
    lastGeneratedDate: string | null;
    generateDailyMissions: () => void;
    updateMissionProgress: (type: DailyMission['type'], progress: number) => void;
    completeMission: (id: string) => { xp: number; coins: number };
    getMissionsForToday: () => DailyMission[];
}

const missionTemplates: Array<{
    type: DailyMission['type'];
    title: string;
    description: string;
    target: number;
    rewardXP: number;
    rewardCoins: number;
}> = [
        {
            type: 'complete_tasks',
            title: 'Task Hunter',
            description: 'Complete 3 tasks today',
            target: 3,
            rewardXP: 30,
            rewardCoins: 15,
        },
        {
            type: 'complete_critical',
            title: 'Critical Strike',
            description: 'Complete 1 critical task',
            target: 1,
            rewardXP: 50,
            rewardCoins: 35,
        },
        {
            type: 'early_bird',
            title: 'Early Bird',
            description: 'Complete a task before 10:00 AM',
            target: 1,
            rewardXP: 25,
            rewardCoins: 10,
        },
        {
            type: 'complete_high',
            title: 'High Achiever',
            description: 'Complete 2 high-priority tasks',
            target: 2,
            rewardXP: 45,
            rewardCoins: 25,
        },
        {
            type: 'complete_tasks',
            title: 'Productivity Burst',
            description: 'Complete 5 tasks today',
            target: 5,
            rewardXP: 70,
            rewardCoins: 40,
        },
        {
            type: 'night_owl',
            title: 'Night Owl',
            description: 'Complete a task after 8:00 PM',
            target: 1,
            rewardXP: 35,
            rewardCoins: 20,
        },
        {
            type: 'no_sweat',
            title: 'No Sweat',
            description: 'Complete 3 low-priority tasks',
            target: 3,
            rewardXP: 20,
            rewardCoins: 8,
        },
        {
            type: 'marathon',
            title: 'Marathon Runner',
            description: 'Complete 7 tasks today',
            target: 7,
            rewardXP: 100,
            rewardCoins: 75,
        },
    ];

function getMotivationWeights(motivation: MainMotivation, type: DailyMission['type']): number {
    switch (motivation) {
        case 'FOCUS':
            return ['complete_critical', 'complete_high'].includes(type) ? 4 : 1;
        case 'DECLUTTER':
            return ['complete_tasks', 'no_sweat', 'marathon'].includes(type) ? 3 : 1;
        case 'HABITS':
            return ['early_bird', 'night_owl'].includes(type) ? 4 : 1;
        default:
            return 1;
    }
}

function pickMissionsForMotivation(motivation: MainMotivation, count: number): DailyMission[] {
    let templates = [...missionTemplates];

    if (motivation === 'REWARDS') {
        templates.sort((a, b) => b.rewardXP - a.rewardXP);
        const topMissions = templates.slice(0, 5).sort(() => Math.random() - 0.5);
        templates = [
            ...topMissions,
            ...templates.slice(5).sort(() => Math.random() - 0.5)
        ];
    } else {
        const weightedPool: typeof missionTemplates = [];
        for (const t of templates) {
            const weight = getMotivationWeights(motivation, t.type);
            for (let i = 0; i < weight; i++) {
                weightedPool.push(t);
            }
        }

        const picked = new Set<string>();
        const result: typeof missionTemplates = [];

        weightedPool.sort(() => Math.random() - 0.5);

        for (const t of weightedPool) {
            if (!picked.has(t.title)) {
                picked.add(t.title);
                result.push(t);
            }
            if (result.length === count) break;
        }

        templates = result;
    }

    return templates.slice(0, count).map((template) => ({
        id: uuidv4(),
        ...template,
        rewardXP: motivation === 'REWARDS' ? Math.floor(template.rewardXP * 1.5) : template.rewardXP,
        rewardCoins: motivation === 'REWARDS' ? Math.floor(template.rewardCoins * 1.5) : template.rewardCoins,
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
                const today = toLocalDateKey(new Date());
                const { lastGeneratedDate } = get();
                if (lastGeneratedDate === today) return;

                const motivation = useUserStore.getState().settings.mainMotivation || 'FOCUS';
                const newMissions = pickMissionsForMotivation(motivation, 3);
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
                if (!mission || mission.completed) return { xp: 0, coins: 0 };

                set((state) => ({
                    missions: state.missions.map((m) =>
                        m.id === id ? { ...m, completed: true } : m
                    ),
                }));

                return { xp: mission.rewardXP, coins: mission.rewardCoins };
            },

            getMissionsForToday: () => {
                const { missions, lastGeneratedDate } = get();
                const today = toLocalDateKey(new Date());
                if (lastGeneratedDate !== today) return [];
                return missions;
            },
        }),
        {
            name: 'todolist-mission-store',
        }
    )
);
