import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, ListTodo, BarChart3, Settings, Swords } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

type NavItem = { to: string; icon: typeof LayoutDashboard; label: string };

const navItemsAnonymous: NavItem[] = [
    { to: '/', icon: LayoutDashboard, label: 'Home' },
    { to: '/tasks', icon: ListTodo, label: 'Quests' },
    { to: '/stats', icon: BarChart3, label: 'Stats' },
    { to: '/settings', icon: Settings, label: 'Profile' },
];

const navItemsAuthed: NavItem[] = [
    { to: '/', icon: LayoutDashboard, label: 'Home' },
    { to: '/tasks', icon: ListTodo, label: 'Quests' },
    { to: '/raids', icon: Swords, label: 'Raids' },
    { to: '/stats', icon: BarChart3, label: 'Stats' },
    { to: '/settings', icon: Settings, label: 'Profile' },
];

export function BottomNav() {
    const location = useLocation();
    const authStatus = useAuthStore((s) => s.status);
    const isSignedIn = authStatus === 'signed-in';
    const navItems = isSignedIn ? navItemsAuthed : navItemsAnonymous;

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
            <div className="max-w-lg mx-auto flex items-center justify-around pt-2 pb-2.5 px-3">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.to
                        || (item.to === '/raids' && location.pathname.startsWith('/raids'));
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className="relative flex flex-col items-center gap-0.5 py-1.5 px-3 group"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="navIndicator"
                                    className="absolute -top-2 w-1.5 h-1.5 rounded-full"
                                    style={{
                                        background: 'linear-gradient(135deg, #22d3ee, #3b82f6)',
                                        boxShadow: '0 0 14px rgba(34, 211, 238, 0.7)',
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
