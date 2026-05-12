import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, ListTodo, BarChart3, Settings } from 'lucide-react';

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Home' },
    { to: '/tasks', icon: ListTodo, label: 'Quests' },
    { to: '/stats', icon: BarChart3, label: 'Stats' },
    { to: '/settings', icon: Settings, label: 'Profile' },
];

export function BottomNav() {
    const location = useLocation();
    if (location.pathname === '/onboarding') return null;

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-30 safe-bottom safe-x"
            style={{
                background: 'var(--color-surface-strong)',
                backdropFilter: 'blur(28px) saturate(180%)',
                WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                borderTop: '1px solid var(--color-border)',
            }}
        >
            <div className="max-w-lg mx-auto flex items-center justify-around pt-2 pb-2.5 px-4">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.to;
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className="relative flex flex-col items-center gap-0.5 py-1.5 px-4 group"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="navIndicator"
                                    className="absolute -top-2 w-1.5 h-1.5 rounded-full"
                                    style={{
                                        background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                                        boxShadow: '0 0 12px rgba(168, 85, 247, 0.65)',
                                    }}
                                    transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                                />
                            )}
                            <item.icon
                                className={`w-5 h-5 transition-colors ${isActive ? 'text-[var(--color-text)]' : 'text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-secondary)]'}`}
                                strokeWidth={isActive ? 2.4 : 2}
                            />
                            <span
                                className={`text-[10px] font-bold tracking-wide transition-colors ${isActive ? 'text-[var(--color-text)]' : 'text-[var(--color-text-tertiary)]'}`}
                            >
                                {item.label}
                            </span>
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
}
