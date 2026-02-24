import { useState } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { getLevelTitle } from '../../lib/gamification';
import { AVAILABLE_AVATARS } from '../../lib/avatars';
import { AvatarShopModal } from './AvatarShopModal';

export function LevelBadge() {
    const { level, equippedAvatar } = useUserStore();
    const title = getLevelTitle(level);
    const [isShopOpen, setIsShopOpen] = useState(false);

    const getBadgeColor = () => {
        if (level >= 30) return 'from-yellow-400 via-amber-500 to-yellow-600 shadow-yellow-500/40 text-yellow-900';
        if (level >= 20) return 'from-purple-400 via-violet-500 to-purple-600 shadow-purple-500/40 text-white';
        if (level >= 10) return 'from-blue-400 via-cyan-500 to-blue-600 shadow-blue-500/40 text-white';
        if (level >= 5) return 'from-emerald-400 via-green-500 to-emerald-600 shadow-emerald-500/40 text-white';
        return 'from-gray-400 via-slate-500 to-gray-600 shadow-gray-500/40 text-white';
    };

    const currentAvatar = AVAILABLE_AVATARS.find(f => f.id === equippedAvatar) || AVAILABLE_AVATARS[0];
    const IconComponent = (Icons as any)[currentAvatar.icon];

    return (
        <>
            <motion.button
                className="relative inline-flex items-center gap-3 text-left"
                whileHover={{ scale: 1.05 }}
                onClick={() => setIsShopOpen(true)}
            >
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shadow-lg border border-white/10">
                    {IconComponent && <IconComponent className={`w-7 h-7 ${currentAvatar.color}`} strokeWidth={2.5} />}
                    <div className="absolute inset-0 rounded-2xl bg-white/5 pointer-events-none" />

                    {/* Level Number Indicator */}
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br ${getBadgeColor()} shadow-md flex items-center justify-center border-2 border-[var(--color-bg)] z-10`}>
                        <span className="font-bold text-[10px] select-none leading-none">{level}</span>
                    </div>
                </div>
                <div>
                    <p className="text-xs font-medium text-[var(--color-text-secondary)] select-none">Level</p>
                    <p className="text-sm font-bold select-none">{title}</p>
                </div>
            </motion.button>

            <AvatarShopModal
                isOpen={isShopOpen}
                onClose={() => setIsShopOpen(false)}
            />
        </>
    );
}
