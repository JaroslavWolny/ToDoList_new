import { Avatar } from '../types';

export const AVAILABLE_AVATARS: Avatar[] = [
    {
        id: 'default',
        name: 'Novice',
        cost: 0,
        icon: 'User',
        color: 'text-gray-400',
    },
    {
        id: 'sword',
        name: 'Warrior Blade',
        cost: 50,
        icon: 'Sword',
        color: 'text-amber-500',
    },
    {
        id: 'shield',
        name: 'Guardian Shield',
        cost: 150,
        icon: 'Shield',
        color: 'text-blue-500',
    },
    {
        id: 'flame',
        name: 'Eternal Flame',
        cost: 300,
        icon: 'Flame',
        color: 'text-orange-500',
    },
    {
        id: 'zap',
        name: 'Thunder Strike',
        cost: 500,
        icon: 'Zap',
        color: 'text-yellow-400',
    },
    {
        id: 'ghost',
        name: 'Phantom Apparition',
        cost: 800,
        icon: 'Ghost',
        color: 'text-purple-400',
    },
    {
        id: 'crown',
        name: 'Royal Crown',
        cost: 1500,
        icon: 'Crown',
        color: 'text-yellow-500',
    },
    {
        id: 'skull',
        name: 'Abyssal Skull',
        cost: 2500,
        icon: 'Skull',
        color: 'text-red-500',
    },
];
