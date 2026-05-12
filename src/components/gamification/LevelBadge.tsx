import { Suspense, lazy, useState } from 'react';
import { motion } from 'framer-motion';
import { useUserStore } from '../../stores/userStore';
import { getLevelTitle } from '../../lib/gamification';
import { AVAILABLE_AVATARS } from '../../lib/avatars';
import { avatarIcons } from '../../lib/avatarIcons';

const AvatarShopModal = lazy(() => import('./AvatarShopModal').then((module) => ({ default: module.AvatarShopModal })));

export function LevelBadge() {
    const { level, equippedAvatar } = useUserStore();
    const title = getLevelTitle(level);
    const [isShopOpen, setIsShopOpen] = useState(false);

    const tierGradient =
        level >= 30 ? 'from-yellow-400 via-amber-500 to-orange-500' :
        level >= 20 ? 'from-fuchsia-400 via-purple-500 to-indigo-500' :
        level >= 10 ? 'from-sky-400 via-cyan-500 to-blue-500' :
        level >= 5  ? 'from-emerald-400 via-green-500 to-teal-500' :
                      'from-slate-300 via-slate-400 to-slate-500';

    const tierGlow =
        level >= 30 ? 'shadow-amber-500/40' :
        level >= 20 ? 'shadow-purple-500/40' :
        level >= 10 ? 'shadow-sky-500/40' :
        level >= 5  ? 'shadow-emerald-500/40' :
                      'shadow-slate-500/30';

    const currentAvatar = AVAILABLE_AVATARS.find((f) => f.id === equippedAvatar) || AVAILABLE_AVATARS[0];
    const IconComponent = avatarIcons[currentAvatar.icon as keyof typeof avatarIcons];

    return (
        <>
            <motion.button
                type="button"
                onClick={() => setIsShopOpen(true)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="relative inline-flex items-center gap-2.5"
            >
                <div className="relative">
                    {/* Avatar tile */}
                    <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800/90 to-slate-900 flex items-center justify-center border border-white/10 shadow-lg overflow-hidden">
                        <div
                            className="absolute inset-0 opacity-50"
                            style={{
                                background:
                                    'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.12), transparent 55%)',
                            }}
                        />
                        {IconComponent && (
                            <IconComponent
                                className={`relative w-6 h-6 ${currentAvatar.color}`}
                                strokeWidth={2.5}
                            />
                        )}
                    </div>
                    {/* Level chip */}
                    <div
                        className={`absolute -bottom-1.5 -right-1.5 min-w-[1.4rem] h-[1.4rem] px-1 rounded-full bg-gradient-to-br ${tierGradient} shadow-lg ${tierGlow} flex items-center justify-center border-2 border-[var(--color-bg)] z-10`}
                    >
                        <span className="font-black text-[10px] text-white leading-none text-stat select-none">
                            {level}
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[9px] uppercase tracking-[0.16em] font-bold text-[var(--color-text-tertiary)] leading-none">
                        Rank
                    </p>
                    <p className="text-[13px] font-bold leading-tight mt-0.5">{title}</p>
                </div>
            </motion.button>

            {isShopOpen && (
                <Suspense fallback={null}>
                    <AvatarShopModal isOpen={isShopOpen} onClose={() => setIsShopOpen(false)} />
                </Suspense>
            )}
        </>
    );
}
